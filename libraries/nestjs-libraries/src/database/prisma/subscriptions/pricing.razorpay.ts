// India-specific pricing (INR). Feature/channel limits stay driven by the
// shared `pricing` table (pricing.ts) - only the price itself differs here,
// since Razorpay bills in INR and the USD numbers don't translate directly.
export interface RazorpayPricingInner {
  month_price: number;
  year_price: number;
}

export const pricingINR: Record<
  'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
  RazorpayPricingInner
> = {
  STANDARD: { month_price: 799, year_price: 7670 },
  TEAM: { month_price: 1999, year_price: 19190 },
  PRO: { month_price: 4999, year_price: 47990 },
  ULTIMATE: { month_price: 9999, year_price: 95990 },
};

export type RazorpayCurrency = 'INR' | 'USD';

// International pricing, now that Razorpay is activated for cross-border
// cards/banks. ULTIMATE has no self-serve USD price - it's "contact us" in
// USD on the marketing site, so it stays INR-only here too.
export const pricingUSD: Record<'STANDARD' | 'TEAM' | 'PRO', RazorpayPricingInner> = {
  STANDARD: { month_price: 9, year_price: 86 },
  TEAM: { month_price: 19, year_price: 182 },
  PRO: { month_price: 49, year_price: 470 },
};

export function getRazorpayPricing(
  billing: keyof typeof pricingINR,
  currency: RazorpayCurrency
): RazorpayPricingInner {
  if (currency === 'INR') {
    return pricingINR[billing];
  }
  if (!(billing in pricingUSD)) {
    throw new Error(`${billing} has no self-serve USD price - contact sales`);
  }
  return pricingUSD[billing as keyof typeof pricingUSD];
}

// One-time purchase, not a subscription plan - grants PRO with isLifetime.
export const LIFETIME_PRO_PRICE_INR = 24999;

// New-user signup offer: knocked off the first billing cycle only, for orgs
// that have never had a subscription (org.allowTrial - same flag that gates
// the free trial, and flips to false for good on first subscription created,
// so this can't be re-triggered by cancelling and resubscribing). Razorpay
// has no per-invoice discount API, so it starts the subscription on a
// separate discounted plan and schedules a change back to the full-price
// plan at cycle end - see RazorpayProvider.findOrCreateDiscountedPlan.
export const NEW_USER_DISCOUNT_PERCENT = 20;
