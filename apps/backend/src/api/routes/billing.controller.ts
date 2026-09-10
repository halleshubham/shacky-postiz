import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { Request } from 'express';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { RazorpayService } from '@gitroom/nestjs-libraries/services/razorpay.service';

@ApiTags('Billing')
@Controller('/billing')
export class BillingController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _stripeService: StripeService,
    private _razorpayService: RazorpayService,
    private _notificationService: NotificationService
  ) {}

  // Razorpay subscription ids are `sub_...`, Stripe customer ids `cus_...`.
  // An org with no paymentId yet (new signup) goes to whichever provider
  // DEFAULT_PAYMENT_PROVIDER names - existing subscribers always keep using
  // whatever provider they're already on, regardless of that env var.
  private isRazorpayOrg(org: Organization) {
    if (org.paymentId) {
      return org.paymentId.startsWith('sub_');
    }
    return process.env.DEFAULT_PAYMENT_PROVIDER === 'razorpay';
  }

  @Get('/check/:id')
  async checkId(
    @GetOrgFromRequest() org: Organization,
    @Param('id') body: string
  ) {
    const status = this.isRazorpayOrg(org)
      ? await this._razorpayService.checkSubscription(org.id, body)
      : await this._stripeService.checkSubscription(org.id, body);
    return { status };
  }

  @Get('/check-discount')
  async checkDiscount(@GetOrgFromRequest() org: Organization) {
    // Razorpay has no pre-created "retention offer" set up - skip straight
    // to no-coupon rather than calling Stripe for an org that isn't on it.
    if (this.isRazorpayOrg(org)) {
      return { offerCoupon: false };
    }
    return {
      offerCoupon: !(await this._stripeService.checkDiscount(org.paymentId))
        ? false
        : AuthService.signJWT({ discount: true }),
    };
  }

  @Post('/apply-discount')
  async applyDiscount(@GetOrgFromRequest() org: Organization) {
    if (this.isRazorpayOrg(org)) {
      return;
    }
    await this._stripeService.applyDiscount(org.paymentId);
  }

  @Post('/finish-trial')
  async finishTrial(@GetOrgFromRequest() org: Organization) {
    try {
      if (this.isRazorpayOrg(org)) {
        await this._razorpayService.finishTrial(org.paymentId);
      } else {
        await this._stripeService.finishTrial(org.paymentId);
      }
    } catch (err) {}
    return {
      finish: true,
    };
  }

  @Get('/is-trial-finished')
  async isTrialFinished(@GetOrgFromRequest() org: Organization) {
    return {
      finished: !org.isTrailing,
    };
  }

  @Post('/subscribe')
  subscribe(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BillingSubscribeDto,
    @Req() req: Request
  ) {
    const uniqueId = req?.cookies?.track;
    return this.isRazorpayOrg(org)
      ? this._razorpayService.subscribe(
          uniqueId,
          org.id,
          user.id,
          body,
          org.allowTrial
        )
      : this._stripeService.subscribe(
          uniqueId,
          org.id,
          user.id,
          body,
          org.allowTrial
        );
  }

  @Get('/portal')
  async modifyPayment(@GetOrgFromRequest() org: Organization) {
    if (this.isRazorpayOrg(org)) {
      // Razorpay has no hosted self-service portal equivalent to Stripe's.
      throw new HttpException(
        'Please contact support to manage this subscription',
        400
      );
    }
    const customer = await this._stripeService.getCustomerByOrganizationId(
      org.id
    );
    const { url } = await this._stripeService.createBillingPortalLink(customer);
    return {
      portal: url,
    };
  }

  @Get('/')
  getCurrentBilling(@GetOrgFromRequest() org: Organization) {
    return this._subscriptionService.getSubscriptionByOrganizationId(org.id);
  }

  @Post('/cancel')
  async cancel(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: { feedback: string }
  ) {
    await this._notificationService.sendEmail(
      process.env.EMAIL_FROM_ADDRESS,
      'Subscription Cancelled',
      `Organization ${org.name} has cancelled their subscription because: ${body.feedback}`,
      user.email
    );

    return this.isRazorpayOrg(org)
      ? this._razorpayService.setToCancel(org.id)
      : this._stripeService.setToCancel(org.id);
  }

  @Post('/prorate')
  prorate(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BillingSubscribeDto
  ) {
    return this.isRazorpayOrg(org)
      ? this._razorpayService.prorate(org.id, body)
      : this._stripeService.prorate(org.id, body);
  }

  @Post('/lifetime')
  async lifetime(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { code: string }
  ) {
    return this._stripeService.lifetimeDeal(org.id, body.code);
  }

  @Post('/add-subscription')
  async addSubscription(
    @Body() body: { subscription: string },
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new Error('Unauthorized');
    }

    await this._subscriptionService.addSubscription(
      org.id,
      user.id,
      body.subscription
    );
  }

  @Post('/lifetime/razorpay/order')
  async createLifetimeRazorpayOrder(@GetOrgFromRequest() org: Organization) {
    return this._razorpayService.createLifetimeOrder(org.id);
  }

  @Post('/lifetime/razorpay/verify')
  async verifyLifetimeRazorpay(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ) {
    return this._razorpayService.verifyLifetimePayment(org.id, body);
  }
}
