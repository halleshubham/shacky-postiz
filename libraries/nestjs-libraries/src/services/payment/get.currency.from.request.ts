// Region-based currency: Cloudflare sits in front of every deployment and
// already stamps every request with the visitor's country, so no separate
// GeoIP service is needed. Gated behind RAZORPAY_INTERNATIONAL_ENABLED - the
// Razorpay merchant account must have International Payments activated
// (a support/KYC request on Razorpay's side, see pricing.international.ts)
// before this can be turned on, so it defaults to fully off (everyone gets
// INR, today's behavior) until that's confirmed.
export function getCurrencyFromHeaders(
  headers: Record<string, string | string[] | undefined>
): 'inr' | 'usd' {
  if (process.env.RAZORPAY_INTERNATIONAL_ENABLED !== 'true') {
    return 'inr';
  }

  const country = headers['cf-ipcountry'];
  const code = (Array.isArray(country) ? country[0] : country || '').toUpperCase();
  return code === 'IN' ? 'inr' : 'usd';
}
