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
  STANDARD: { month_price: 399, year_price: 3990 },
  TEAM: { month_price: 999, year_price: 9990 },
  PRO: { month_price: 2499, year_price: 24990 },
  ULTIMATE: { month_price: 4999, year_price: 49990 },
};
