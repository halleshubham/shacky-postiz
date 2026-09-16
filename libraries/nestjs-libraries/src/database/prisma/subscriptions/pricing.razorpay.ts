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
  STANDARD: { month_price: 499, year_price: 4790 },
  TEAM: { month_price: 1499, year_price: 14390 },
  PRO: { month_price: 2999, year_price: 28790 },
  ULTIMATE: { month_price: 5999, year_price: 57590 },
};

// One-time purchase, not a subscription plan - grants PRO with isLifetime.
export const LIFETIME_PRO_PRICE_INR = 19999;

// New-user signup offer: knocked off the first billing cycle only, for orgs
// that have never had a subscription (org.allowTrial - same flag that gates
// the free trial, and flips to false for good on first subscription created,
// so this can't be re-triggered by cancelling and resubscribing). Stripe
// applies this as a `duration: 'once'` coupon; Razorpay has no per-invoice
// discount API, so it starts the subscription on a separate discounted plan
// and schedules a change back to the full-price plan at cycle end.
export const NEW_USER_DISCOUNT_PERCENT = 30;
