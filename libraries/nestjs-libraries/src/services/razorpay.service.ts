import { HttpException, Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { pricingINR } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing.razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_nothing',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'nothing',
});

type Billing = 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE';
type Period = 'MONTHLY' | 'YEARLY';

// Billing cycles to pre-authorize: effectively "until cancelled" (10 years).
const TOTAL_COUNT: Record<Period, number> = {
  MONTHLY: 120,
  YEARLY: 10,
};

// Sibling to StripeService, for orgs paying in INR via Razorpay. There's no
// `provider` column on Subscription at this schema version, so we tell the
// two apart by the org's paymentId prefix instead: Razorpay subscription ids
// are `sub_...`, Stripe customer ids are `cus_...` - see isRazorpayOrg() in
// billing.controller.ts. Simple hosted-checkout flow (short_url), so unlike
// Stripe we don't need to pre-create a customer before checkout.
@Injectable()
export class RazorpayService {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService
  ) {}

  validateWebhook(rawBody: Buffer, signature: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (
      !secret ||
      !signature ||
      !validateWebhookSignature(rawBody.toString('utf8'), signature, secret)
    ) {
      throw new HttpException('Invalid webhook signature', 401);
    }
    return JSON.parse(rawBody.toString('utf8'));
  }

  async processWebhook(event: any) {
    const entity = event?.payload?.subscription?.entity;
    if (!entity || entity?.notes?.service !== 'gitroom') {
      return { ok: true };
    }

    switch (event.event) {
      // 'authenticated' fires as soon as the mandate is registered - for a
      // trial subscription (future start_at) this is the ONLY event we get
      // until the trial ends, so it has to create the DB row too, or the
      // frontend's post-checkout poll (checkSubscription) would spin forever.
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.updated':
        return this.upsertSubscription(entity);
      case 'subscription.cancelled':
      case 'subscription.completed':
      case 'subscription.expired':
        return this.removeSubscription(entity);
      default:
        return { ok: true };
    }
  }

  private async upsertSubscription(entity: any) {
    const { billing, period, organizationId, id } = entity.notes as {
      billing: Billing;
      period: Period;
      organizationId: string;
      id: string;
    };
    if (!organizationId || !billing || !period) {
      return { ok: false };
    }

    // Keep our record of the Razorpay subscription id current, in case the
    // checkout flow's own write (in `subscribe`) was ever missed.
    await this._subscriptionService.updateCustomerId(organizationId, entity.id);

    // Razorpay subscriptions sit in 'authenticated' status from mandate
    // registration until `start_at` arrives and the first real charge
    // succeeds (status becomes 'active') - that window is our trial period.
    const isTrailing = entity.status === 'authenticated';

    return this._subscriptionService.createOrUpdateSubscription(
      isTrailing,
      // Must be the same `id` `subscribe()` put in notes and handed back to
      // the frontend as `checkId` - checkSubscription() below matches on it
      // to tell the post-checkout poll the webhook has landed.
      id || makeId(10),
      entity.id,
      pricing[billing].channel || 0,
      // createOrUpdateSubscription's own type is narrower ('STANDARD' | 'PRO')
      // than the tiers that actually exist - StripeService's webhook handler
      // has the exact same mismatch and casts the same way.
      billing as 'STANDARD' | 'PRO',
      period,
      entity.cancel_at ? Number(entity.cancel_at) : null
    );
  }

  private async removeSubscription(entity: any) {
    return this._subscriptionService.deleteSubscription(entity.id);
  }

  // Razorpay Plans have no "list by product name" like Stripe - we find one
  // by matching our own notes, and create it on first use per tier+period.
  private async findOrCreatePlan(billing: Billing, period: Period) {
    const amount =
      period === 'MONTHLY'
        ? pricingINR[billing].month_price
        : pricingINR[billing].year_price;

    const existing = await razorpay.plans.all({ count: 100 });
    const found = (existing.items || []).find(
      (p: any) => p.notes?.billing === billing && p.notes?.period === period
    );
    if (found) {
      return found;
    }

    return razorpay.plans.create({
      period: period === 'MONTHLY' ? 'monthly' : 'yearly',
      interval: 1,
      item: {
        name: `${billing} ${period}`,
        amount: amount * 100, // paise
        currency: 'INR',
      },
      notes: { billing, period },
    });
  }

  async subscribe(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ) {
    const id = makeId(10);
    const plan = await this.findOrCreatePlan(body.billing, body.period);

    // Existing subscriber changing tier/period - update the live Razorpay
    // subscription in place instead of starting a second one, mirroring
    // StripeService.subscribe's `subscriptions.update` branch. Falls through
    // to creating a fresh subscription below if this org has no subscription
    // yet, or if the update is rejected (e.g. the old one already ended).
    const existingSubscription = await this._subscriptionService.getSubscription(
      organizationId
    );
    if (existingSubscription) {
      const org = await this._organizationService.getOrgById(organizationId);
      if (org?.paymentId?.startsWith('sub_')) {
        try {
          await razorpay.subscriptions.update(org.paymentId, {
            plan_id: plan.id,
            schedule_change_at: 'now',
            customer_notify: 1,
          });
          return { id };
        } catch (err) {
          // fall through to a fresh subscription
        }
      }
    }

    // Razorpay has no separate "trial_period_days" - delaying `start_at`
    // leaves the subscription in 'authenticated' status (mandate registered,
    // not yet charged) until that date, which is our trial equivalent.
    const startAt = allowTrial
      ? Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
      : undefined;

    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.id,
      total_count: TOTAL_COUNT[body.period],
      customer_notify: 1,
      ...(startAt ? { start_at: startAt } : {}),
      notes: {
        service: 'gitroom',
        billing: body.billing,
        period: body.period,
        organizationId,
        userId,
        uniqueId,
        id,
      },
    });

    // Set immediately so cancel/lookup works even before the webhook lands.
    await this._subscriptionService.updateCustomerId(
      organizationId,
      subscription.id
    );

    // Razorpay's hosted short_url page has no callback/success URL - the
    // frontend embeds Razorpay Checkout instead, using razorpaySubscriptionId
    // to open it and checkId to poll /billing/check/:id afterwards, same as
    // the Stripe checkout-session flow's `check=${uniqueId}` redirect.
    return { razorpaySubscriptionId: subscription.id, checkId: id };
  }

  // Moves `start_at` to now on a not-yet-started subscription, ending the
  // trial early and triggering the first charge immediately.
  async finishTrial(subscriptionId: string) {
    return razorpay.subscriptions.update(subscriptionId, {
      start_at: Math.floor(Date.now() / 1000),
      schedule_change_at: 'now',
    });
  }

  // Razorpay has no upcoming-invoice preview like Stripe's - estimate the
  // switch cost ourselves from the remaining time in the current billing
  // cycle, so the UI can still show a "pay today" figure before committing.
  async prorate(organizationId: string, body: BillingSubscribeDto) {
    const [org, currentSubscription] = await Promise.all([
      this._organizationService.getOrgById(organizationId),
      this._subscriptionService.getSubscription(organizationId),
    ]);

    if (!org?.paymentId || !currentSubscription) {
      return { price: false };
    }

    const razorpaySubscription = await razorpay.subscriptions.fetch(
      org.paymentId
    );
    if (razorpaySubscription.status !== 'active') {
      return { price: false };
    }

    const priceKey = body.period === 'MONTHLY' ? 'month_price' : 'year_price';
    const currentPrice =
      pricingINR[currentSubscription.subscriptionTier as Billing]?.[
        priceKey
      ] || 0;
    const newPrice = pricingINR[body.billing][priceKey];

    const cycleStart = razorpaySubscription.current_start;
    const cycleEnd = razorpaySubscription.current_end;
    if (!cycleStart || !cycleEnd || cycleEnd <= cycleStart) {
      return { price: newPrice };
    }

    const now = Math.floor(Date.now() / 1000);
    const remainingFraction =
      Math.max(cycleEnd - now, 0) / (cycleEnd - cycleStart);

    return { price: Math.max((newPrice - currentPrice) * remainingFraction, 0) };
  }

  // Called by the post-checkout poll (CheckPayment component) with the same
  // local `checkId` returned from subscribe() - NOT a Razorpay id. Contract
  // matches StripeService.checkSubscription: 0 keep polling, 1 failed,
  // 2 succeeded.
  async checkSubscription(organizationId: string, subscriptionId: string) {
    const orgValue = await this._subscriptionService.checkSubscription(
      organizationId,
      subscriptionId
    );
    if (orgValue) {
      return 2;
    }

    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      return 0;
    }

    try {
      const subscription = await razorpay.subscriptions.fetch(org.paymentId);
      if (['cancelled', 'expired', 'completed'].includes(subscription.status)) {
        return 1;
      }
    } catch (err) {
      return 0;
    }

    return 0;
  }

  async setToCancel(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      throw new HttpException('No active subscription', 400);
    }
    const id = makeId(10);
    await razorpay.subscriptions.cancel(org.paymentId, true);
    return { id };
  }
}
