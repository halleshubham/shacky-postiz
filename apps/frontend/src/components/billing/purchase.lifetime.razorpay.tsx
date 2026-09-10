'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useSWRConfig } from 'swr';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { LIFETIME_PRO_PRICE_INR } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing.razorpay';

// Razorpay Orders/Checkout has no script bundled elsewhere in the app -
// loaded lazily here since this button may never be clicked.
const loadRazorpayCheckout = () =>
  new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const PurchaseLifetimeRazorpay: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const toast = useToaster();
  const { mutate } = useSWRConfig();
  const { razorpayKeyId, isGeneral } = useVariables();
  const user = useUser();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { orderId, amount, currency } = await (
      await fetch('/billing/lifetime/razorpay/order', { method: 'POST' })
    ).json();
    if (!orderId) {
      toast.show('Could not start the purchase, please try again', 'warning');
      setLoading(false);
      return;
    }

    const loaded = await loadRazorpayCheckout();
    if (!loaded) {
      toast.show(
        'Could not load the payment form, please try again',
        'warning'
      );
      setLoading(false);
      return;
    }

    const razorpayCheckout = new (window as any).Razorpay({
      key: razorpayKeyId,
      order_id: orderId,
      amount,
      currency,
      name: isGeneral ? 'Postiz' : 'Gitroom',
      description: 'Lifetime PRO account',
      prefill: { email: user?.email },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const { success } = await (
          await fetch('/billing/lifetime/razorpay/verify', {
            method: 'POST',
            body: JSON.stringify(response),
            headers: { 'Content-Type': 'application/json' },
          })
        ).json();
        if (success) {
          mutate('/user/self');
          toast.show('Successfully purchased the lifetime plan');
        } else {
          toast.show(
            'Payment received but could not confirm automatically, please contact support',
            'warning'
          );
        }
        setLoading(false);
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    });
    razorpayCheckout.open();
  }, []);

  return (
    <div className="flex-1 bg-sixth items-center border border-customColor6 rounded-[4px] p-[24px] gap-[16px] flex [@media(max-width:1024px)]:items-center">
      <div>
        {t(
          'purchase_a_life_time_pro_account_razorpay',
          `Purchase a Life-time PRO account (₹${LIFETIME_PRO_PRICE_INR.toLocaleString(
            'en-IN'
          )} one-time)`
        )}
      </div>
      <div>
        <Button loading={loading} onClick={load}>
          {t('purchase_now', 'Purchase now')}
        </Button>
      </div>
    </div>
  );
};
