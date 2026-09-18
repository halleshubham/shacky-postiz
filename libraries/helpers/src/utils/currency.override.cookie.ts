// Plain constant, safe to import from client components - kept separate
// from get.billing.currency.server.side.ts, which pulls in "next/headers"
// and can't be imported anywhere near client-bundled code.
export const CURRENCY_OVERRIDE_COOKIE = 'currency_override';
