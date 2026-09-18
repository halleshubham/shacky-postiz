import { headers, cookies } from 'next/headers';
import { CURRENCY_OVERRIDE_COOKIE } from '@gitroom/helpers/utils/currency.override.cookie';

// Region-based pricing: India gets INR, everywhere else gets USD, detected
// from Cloudflare's CF-IPCountry header (no separate GeoIP service needed,
// Cloudflare stamps this on every request already). Gated behind
// RAZORPAY_INTERNATIONAL_ENABLED - Razorpay's International Payments must be
// activated on the merchant account first, so this defaults to fully off
// (everyone gets whatever DEFAULT_WEB_PAYMENT_PROVIDER already implies,
// today's behavior) until that's confirmed. A manual override cookie lets a
// misdetected visitor switch currency themselves.
export const getBillingCurrencyServerSide = async (): Promise<
  'inr' | 'usd'
> => {
  if (process.env.DEFAULT_WEB_PAYMENT_PROVIDER !== 'razorpay') {
    return 'usd';
  }

  if (process.env.RAZORPAY_INTERNATIONAL_ENABLED !== 'true') {
    return 'inr';
  }

  const cookieStore = await cookies();
  const override = cookieStore.get(CURRENCY_OVERRIDE_COOKIE)?.value;
  if (override === 'inr' || override === 'usd') {
    return override;
  }

  const headerList = await headers();
  const country = (headerList.get('cf-ipcountry') || '').toUpperCase();
  return country === 'IN' ? 'inr' : 'usd';
};
