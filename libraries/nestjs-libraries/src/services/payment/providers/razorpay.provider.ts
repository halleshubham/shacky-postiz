import { HttpException } from '@nestjs/common';
import Razorpay from 'razorpay';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  validateWebhookSignature,
  validatePaymentVerification,
} = require('razorpay/dist/utils/razorpay-utils');
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import {
  LIFETIME_PRO_PRICE_INR,
  NEW_USER_DISCOUNT_PERCENT,
  getRazorpayPricing,
  RazorpayCurrency,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing.razorpay';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import {
  PaymentPlatform,
  PaymentProvider,
  PaymentProviderAbstract,
} from '@gitroom/nestjs-libraries/services/payment/payment.provider.interface';
import { RAZORPAY_PROVIDER } from '@gitroom/nestjs-libraries/services/payment/payment.providers';

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

// Simple hosted-checkout Subscriptions flow: Razorpay collects the customer's
// details on its own checkout page (short_url), so unlike Stripe we don't need
// to pre-create a customer before checkout - the subscription id itself is
// the stable identifier we key everything off (stored as org.paymentId).
@PaymentProvider({ provider: RAZORPAY_PROVIDER })
export class RazorpayProvider extends PaymentProviderAbstract {
  platform: PaymentPlatform = 'web';

  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService
  ) {
    super();
  }

  validateWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = headers['x-razorpay-signature'] as string;

    if (
      !secret ||
      !signature ||
      !validateWebhookSignature(rawBody.toString('utf8'), signature, secret)
    ) {
      throw new HttpException('Invalid webhook signature', 401);
    }

    return JSON.parse(rawBody.toString('utf8'));
  }

  async processWebhook(body: any) {
    // One-time lifetime purchase (Orders API), not a subscription - the
    // client-side signature check in verifyLifetimePayment is the primary
    // confirmation path, this is just a backup in case the browser tab
    // closed before that call went out. Idempotent either way.
    if (body.event === 'payment.captured') {
      return this.handleLifetimePayment(body?.payload?.payment?.entity);
    }

    const entity = body?.payload?.subscription?.entity;
    if (!entity || entity?.notes?.service !== 'gitroom') {
      return { ok: true };
    }

    switch (body.event) {
      // 'authenticated' fires as soon as the mandate is registered - for a
      // trial subscription (future start_at) this is the ONLY event we get
      // until the trial ends, so it has to create the DB row too, or the
      // frontend's post-checkout poll would spin forever.
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
    const { billing, period, organizationId, id, currency } = entity.notes as {
      billing: Billing;
      period: Period;
      organizationId: string;
      id: string;
      currency?: RazorpayCurrency;
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

    return this._subscriptionService.createOrUpdateSubscriptionByOrg(
      isTrailing,
      organizationId,
      RAZORPAY_PROVIDER,
      // Must be the same `id` `subscribe()` put in notes and handed back to
      // the frontend as `checkId` - checkSubscription() below matches on it
      // to tell the post-checkout poll the webhook has landed.
      id || makeId(10),
      pricing[billing].channel || 0,
      billing,
      period,
      entity.cancel_at ? Number(entity.cancel_at) : null,
      currency || 'INR'
    );
  }

  private async removeSubscription(entity: any) {
    const organizationId = entity?.notes?.organizationId;
    if (!organizationId) {
      return { ok: false };
    }
    return this._subscriptionService.deleteSubscriptionByOrgId(
      organizationId,
      RAZORPAY_PROVIDER
    );
  }

  // Razorpay Plans have no "list by product name" like Stripe, and their
  // amount is immutable once created - we find one by matching our own notes
  // AND the current amount, so a pricing table change creates a fresh plan
  // instead of silently reusing an old one at the old price. Stale plans from
  // previous price points are just left behind in Razorpay, harmless clutter.
  private async findOrCreatePlan(
    billing: Billing,
    period: Period,
    currency: RazorpayCurrency
  ) {
    const pricingRow = getRazorpayPricing(billing, currency);
    const amount =
      period === 'MONTHLY' ? pricingRow.month_price : pricingRow.year_price;

    const existing = await razorpay.plans.all({ count: 100 });
    const found = (existing.items || []).find(
      (p: any) =>
        p.notes?.billing === billing &&
        p.notes?.period === period &&
        p.notes?.currency === currency &&
        !p.notes?.newUserDiscount &&
        p.item?.amount === amount * 100
    );
    if (found) {
      return found;
    }

    return razorpay.plans.create({
      period: period === 'MONTHLY' ? 'monthly' : 'yearly',
      interval: 1,
      item: {
        name: `${billing} ${period} (${currency})`,
        amount: amount * 100, // paise, or cents for USD
        currency,
      },
      notes: { billing, period, currency },
    });
  }

  // New-user signup offer: Razorpay has no per-invoice discount API like
  // Stripe's coupons, so the discount is a separate plan at the reduced
  // amount - the subscription starts on this plan, then subscribe()
  // schedules a change back to the full-price plan for cycle end, so only
  // the first paid cycle is discounted.
  private async findOrCreateDiscountedPlan(
    billing: Billing,
    period: Period,
    currency: RazorpayCurrency
  ) {
    const pricingRow = getRazorpayPricing(billing, currency);
    const fullAmount =
      period === 'MONTHLY' ? pricingRow.month_price : pricingRow.year_price;
    const amount = Math.round(
      (fullAmount * (100 - NEW_USER_DISCOUNT_PERCENT)) / 100
    );

    const existing = await razorpay.plans.all({ count: 100 });
    const found = (existing.items || []).find(
      (p: any) =>
        p.notes?.billing === billing &&
        p.notes?.period === period &&
        p.notes?.currency === currency &&
        p.notes?.newUserDiscount === 'true' &&
        p.item?.amount === amount * 100
    );
    if (found) {
      return found;
    }

    return razorpay.plans.create({
      period: period === 'MONTHLY' ? 'monthly' : 'yearly',
      interval: 1,
      item: {
        name: `${billing} ${period} (${currency}, new user offer)`,
        amount: amount * 100, // paise, or cents for USD
        currency,
      },
      notes: { billing, period, currency, newUserDiscount: 'true' },
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
    const currency: RazorpayCurrency = body.currency || 'INR';
    if (currency === 'USD' && body.billing === 'ULTIMATE') {
      throw new HttpException(
        'The Scale plan is contact-us only in USD - reach out to support@shackyapps.in',
        400
      );
    }
    const plan = await this.findOrCreatePlan(body.billing, body.period, currency);

    // Existing subscriber changing tier/period - update the live Razorpay
    // subscription in place instead of starting a second one. Gated on a
    // CONFIRMED local subscription (not just org.paymentId, which is written
    // as soon as any subscribe() call fires - before the webhook confirms
    // the mandate) - otherwise a user whose first checkout was abandoned or
    // whose webhook hasn't landed yet would have every retry silently try to
    // "update" that unconfirmed subscription instead of getting a fresh
    // checkout to actually pay with. Falls through to creating a fresh
    // subscription below if this org has no confirmed subscription yet, or
    // if the update is rejected (e.g. it already ended).
    const [org, currentSubscription] = await Promise.all([
      this._organizationService.getOrgById(organizationId),
      this._subscriptionService.getSubscription(organizationId),
    ]);
    if (org?.paymentId && currentSubscription) {
      try {
        await razorpay.subscriptions.update(org.paymentId, {
          plan_id: plan.id,
          schedule_change_at: 'now',
          customer_notify: 1,
        });
        return { url: undefined as string | undefined, id };
      } catch (err) {
        // fall through to a fresh subscription
      }
    }

    // Razorpay has no separate "trial_period_days" - delaying `start_at`
    // leaves the subscription in 'authenticated' status (mandate registered,
    // not yet charged) until that date, which is our trial equivalent.
    const startAt = allowTrial
      ? Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
      : undefined;

    // New-user signup offer applies alongside the trial (same `allowTrial`
    // gate, which permanently flips false on this org's first subscription,
    // so it can't be replayed by cancelling and resubscribing). Subscription
    // starts on the discounted plan; the change back to full price is
    // scheduled for cycle end right after creation, so only the first paid
    // cycle is discounted.
    const initialPlan = allowTrial
      ? await this.findOrCreateDiscountedPlan(body.billing, body.period, currency)
      : plan;

    const subscription = await razorpay.subscriptions.create({
      plan_id: initialPlan.id,
      total_count: TOTAL_COUNT[body.period],
      customer_notify: 1,
      ...(startAt ? { start_at: startAt } : {}),
      notes: {
        service: 'gitroom',
        billing: body.billing,
        period: body.period,
        currency,
        organizationId,
        userId,
        uniqueId,
        id,
      },
    });

    if (allowTrial) {
      try {
        await razorpay.subscriptions.update(subscription.id, {
          plan_id: plan.id,
          schedule_change_at: 'cycle_end',
        });
      } catch (err) {
        // Not fatal - worst case the discounted plan just keeps renewing at
        // the discounted price, which fails safe (cheaper for us, not free).
      }
    }

    // Set immediately so cancel/lookup works even before the webhook lands.
    await this._subscriptionService.updateCustomerId(
      organizationId,
      subscription.id
    );

    // Razorpay's hosted short_url page has no callback/success URL (unlike
    // Stripe Checkout Sessions or Razorpay Payment Links) - the frontend
    // embeds Razorpay Checkout instead, using razorpaySubscriptionId to open
    // it and checkId to poll /billing/check/:id afterwards, same as Stripe's
    // checkout-session flow's `check=${uniqueId}` redirect.
    return { razorpaySubscriptionId: subscription.id, checkId: id };
  }

  // Razorpay's hosted short_url page has no upcoming-invoice preview like
  // Stripe's - estimate the switch cost ourselves from the remaining time in
  // the current billing cycle, so the UI can still show a "pay today" figure.
  override async prorate(organizationId: string, body: BillingSubscribeDto) {
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

    // A tier/period switch stays in whatever currency the subscription is
    // already billed in - switching currency isn't a supported flow here.
    const currency = (currentSubscription.currency as RazorpayCurrency) || 'INR';
    const priceKey = body.period === 'MONTHLY' ? 'month_price' : 'year_price';
    const currentPrice =
      getRazorpayPricing(currentSubscription.subscriptionTier as Billing, currency)?.[
        priceKey
      ] || 0;
    const newPrice = getRazorpayPricing(body.billing, currency)[priceKey];

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

  // Moves `start_at` to now on a not-yet-started subscription, ending the
  // trial early and triggering the first charge immediately.
  override async finishTrial(organization: { paymentId?: string | null }) {
    if (!organization.paymentId) {
      return;
    }
    return razorpay.subscriptions.update(organization.paymentId, {
      start_at: Math.floor(Date.now() / 1000),
      schedule_change_at: 'now',
    });
  }

  // One-time payment (Razorpay Orders, not Subscriptions) for a lifetime PRO
  // plan - separate from the generic `lifetimeDeal(code)` contract, which is
  // for redeeming a promo code, not taking a live payment.
  async createLifetimeOrder(organizationId: string) {
    const id = makeId(10);
    const order = await razorpay.orders.create({
      amount: LIFETIME_PRO_PRICE_INR * 100,
      currency: 'INR',
      receipt: id,
      notes: {
        service: 'gitroom',
        type: 'lifetime',
        organizationId,
        id,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  }

  // Razorpay Orders/Payments have a real signature-verified success callback
  // (unlike Subscriptions' bare short_url) - this is the primary confirmation
  // path, checked synchronously right after Checkout succeeds. The
  // 'payment.captured' webhook branch below is just a backup in case the
  // browser tab closed before this call went out; both paths are idempotent
  // since they both go through SubscriptionService.lifeTime().
  async verifyLifetimePayment(
    organizationId: string,
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ) {
    const valid = validatePaymentVerification(
      { order_id: body.razorpay_order_id, payment_id: body.razorpay_payment_id },
      body.razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );
    if (!valid) {
      throw new HttpException('Invalid payment signature', 400);
    }

    const order = await razorpay.orders.fetch(body.razorpay_order_id);
    const notes = (order.notes || {}) as {
      type?: string;
      organizationId?: string;
      id?: string;
    };
    if (notes.type !== 'lifetime' || notes.organizationId !== organizationId) {
      throw new HttpException('Order does not match this organization', 400);
    }

    await this._subscriptionService.lifeTime(
      organizationId,
      RAZORPAY_PROVIDER,
      notes.id || body.razorpay_payment_id,
      'PRO'
    );

    return { success: true };
  }

  private async handleLifetimePayment(paymentEntity: any) {
    if (!paymentEntity?.order_id) {
      return { ok: true };
    }
    const order = await razorpay.orders.fetch(paymentEntity.order_id);
    const notes = (order.notes || {}) as {
      service?: string;
      type?: string;
      organizationId?: string;
      id?: string;
    };
    if (
      notes.service !== 'gitroom' ||
      notes.type !== 'lifetime' ||
      !notes.organizationId
    ) {
      return { ok: true };
    }

    await this._subscriptionService.lifeTime(
      notes.organizationId,
      RAZORPAY_PROVIDER,
      notes.id || paymentEntity.id,
      'PRO'
    );
    return { ok: true };
  }

  // Called by the post-checkout poll (CheckPayment component) with the same
  // local `checkId` returned from subscribe() - NOT a Razorpay id. Contract
  // matches StripeService.checkSubscription: 0 keep polling, 1 failed,
  // 2 succeeded.
  override async checkSubscription(organizationId: string, checkId: string) {
    const orgValue = await this._subscriptionService.checkSubscription(
      organizationId,
      checkId
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

  // Razorpay has no hosted self-service portal equivalent to Stripe's.
  override async portalLink(organizationId: string): Promise<{ url: string }> {
    throw new HttpException(
      'Please contact support to manage this subscription',
      400
    );
  }

  override async setToCancel(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      throw new HttpException('No active subscription', 400);
    }

    const id = makeId(10);
    const currentSubscription = await this._subscriptionService.getSubscription(
      organizationId
    );

    const subscription = await razorpay.subscriptions.cancel(
      org.paymentId,
      true
    );

    // cancelAtCycleEnd leaves the subscription 'active' in Razorpay until the
    // period actually ends (it has no dedicated "cancels at" field like
    // Stripe's cancel_at) - current_end is that date. Write it into our own
    // row immediately rather than waiting on a webhook, since Razorpay
    // doesn't reliably send one for this specific transition, and the
    // frontend uses this response's cancel_at to update the UI right away.
    const cancelAt = subscription.current_end;
    if (currentSubscription && cancelAt) {
      await this._subscriptionService.createOrUpdateSubscriptionByOrg(
        false,
        organizationId,
        RAZORPAY_PROVIDER,
        currentSubscription.identifier || id,
        currentSubscription.totalChannels,
        currentSubscription.subscriptionTier as Billing,
        currentSubscription.period as Period,
        cancelAt
      );
    }

    return {
      id,
      cancel_at: cancelAt ? new Date(cancelAt * 1000) : undefined,
    };
  }

  override async cancelAllSubscriptions(organizationId: string) {
    // getOrgById must not filter deletedAt - this can run for an organization
    // that was already soft deleted by an account deletion
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      return;
    }

    try {
      await razorpay.subscriptions.cancel(org.paymentId, false);
    } catch (err) {
      /* already cancelled / expired on Razorpay's side */
    }

    await this._subscriptionService.deleteSubscriptionByOrgId(
      organizationId,
      RAZORPAY_PROVIDER
    );
  }
}
