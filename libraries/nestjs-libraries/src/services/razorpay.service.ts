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
    const { billing, period, organizationId } = entity.notes as {
      billing: Billing;
      period: Period;
      organizationId: string;
    };
    if (!organizationId || !billing || !period) {
      return { ok: false };
    }

    // Keep our record of the Razorpay subscription id current, in case the
    // checkout flow's own write (in `subscribe`) was ever missed.
    await this._subscriptionService.updateCustomerId(organizationId, entity.id);

    return this._subscriptionService.createOrUpdateSubscription(
      false,
      makeId(10),
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

    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.id,
      total_count: TOTAL_COUNT[body.period],
      customer_notify: 1,
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

    return { url: subscription.short_url };
  }

  async checkSubscription(organizationId: string, subscriptionId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (org?.paymentId !== subscriptionId) {
      return { active: false };
    }
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return { active: subscription.status === 'active' };
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
