import { HttpException, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  PaymentPlatform,
  PaymentProviderAbstract,
} from '@gitroom/nestjs-libraries/services/payment/payment.provider.interface';

@Injectable()
export class PaymentProviderManager {
  constructor(private _moduleRef: ModuleRef) {}

  private metadata(): { target: any; provider: string }[] {
    return (
      Reflect.getMetadata('payment-provider', PaymentProviderAbstract) || []
    );
  }

  getProvider(provider: string): PaymentProviderAbstract {
    const found = this.metadata().find((m) => m.provider === provider);

    if (!found) {
      throw new HttpException(`Payment provider ${provider} not found`, 400);
    }

    return this._moduleRef.get(found.target, { strict: false });
  }

  getProviders(): { name: string; provider: PaymentProviderAbstract }[] {
    return this.metadata().map((m) => ({
      name: m.provider,
      provider: this._moduleRef.get(m.target, { strict: false }),
    }));
  }

  // The one new subscriptions use for a platform: DEFAULT_WEB_PAYMENT_PROVIDER
  // picks it for 'web' when set (e.g. 'razorpay'); otherwise the first
  // registered provider of that platform wins, same as before.
  getDefaultProvider(platform: PaymentPlatform) {
    const providers = this.getProviders().filter(
      (p) => p.provider.platform === platform
    );

    const preferred =
      platform === 'web' ? process.env.DEFAULT_WEB_PAYMENT_PROVIDER : undefined;
    const found = preferred
      ? providers.find((p) => p.name === preferred) || providers[0]
      : providers[0];

    if (!found) {
      throw new Error(`No payment provider registered for ${platform}`);
    }

    return found;
  }
}
