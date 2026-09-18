'use client';

import { FC, useCallback } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { CURRENCY_OVERRIDE_COOKIE } from '@gitroom/helpers/utils/currency.override.cookie';

// Only relevant on a Razorpay-international deployment - a Stripe-only
// deployment's currency isn't region-detected, so there's nothing to
// override. Lets a misdetected visitor flip currency themselves; the choice
// sticks via a cookie the server-side layouts read on every request.
export const CurrencyOverrideComponent: FC = () => {
  const { currency, razorpayInternational } = useVariables();
  const t = useT();

  const switchTo = useCallback((next: 'inr' | 'usd') => {
    document.cookie = `${CURRENCY_OVERRIDE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }, []);

  if (!razorpayInternational) {
    return null;
  }

  return (
    <div className="text-center text-[13px] text-customColor18 mt-[8px]">
      {currency === 'inr' ? (
        <>
          {t('prices_shown_in_inr', 'Prices shown in ₹.')}{' '}
          <span
            className="underline cursor-pointer"
            onClick={() => switchTo('usd')}
          >
            {t('not_in_india_switch_to_usd', 'Not in India? Switch to $')}
          </span>
        </>
      ) : (
        <>
          {t('prices_shown_in_usd', 'Prices shown in $.')}{' '}
          <span
            className="underline cursor-pointer"
            onClick={() => switchTo('inr')}
          >
            {t('in_india_switch_to_inr', 'In India? Switch to ₹')}
          </span>
        </>
      )}
    </div>
  );
};
