// International (non-India) pricing in USD. Deliberately undercuts Postiz.com
// (our closest comparable, $29/$39/$49/$99) at every tier - see pricing.razorpay.ts
// for the India-specific (INR) equivalent. Same ~20% annual discount ratio as
// the INR table for consistency.
import { RazorpayPricingInner } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing.razorpay';

export const pricingUSD: Record<
  'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
  RazorpayPricingInner
> = {
  STANDARD: { month_price: 19, year_price: 182 },
  TEAM: { month_price: 29, year_price: 278 },
  PRO: { month_price: 39, year_price: 374 },
  ULTIMATE: { month_price: 79, year_price: 758 },
};
