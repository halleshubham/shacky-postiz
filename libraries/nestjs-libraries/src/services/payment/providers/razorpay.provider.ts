import { HttpException } from '@nestjs/common';
import Razorpay from 'razorpay';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { pricingINR } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing.razorpay';
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
    const entity = body?.payload?.subscription?.entity;
    if (!entity || entity?.notes?.service !== 'gitroom') {
      return { ok: true };
    }

    switch (body.event) {
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

    return this._subscriptionService.createOrUpdateSubscriptionByOrg(
      false,
      organizationId,
      RAZORPAY_PROVIDER,
      makeId(10),
      pricing[billing].channel || 0,
      billing,
      period,
      entity.cancel_at ? Number(entity.cancel_at) : null
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

  override async checkSubscription(
    organizationId: string,
    subscriptionId: string
  ) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (org?.paymentId !== subscriptionId) {
      return { active: false };
    }

    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return { active: subscription.status === 'active' };
  }

  override async setToCancel(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      throw new HttpException('No active subscription', 400);
    }

    const id = makeId(10);
    await razorpay.subscriptions.cancel(org.paymentId, true);
    return { id };
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
