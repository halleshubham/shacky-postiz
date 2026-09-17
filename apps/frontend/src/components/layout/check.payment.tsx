import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import Loading from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { timer } from '@gitroom/helpers/utils/timer';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
export const CheckPayment: FC<{
  check: string;
  mutate: () => void;
  children: ReactNode;
}> = (props) => {
  if (!props.check) {
    return <>{props.children}</>;
  }
  return <CheckPaymentInner {...props} />;
};

export const CheckPaymentInner: FC<{
  check: string;
  mutate: () => void;
  children: ReactNode;
}> = (props) => {
  const [showLoader, setShowLoader] = useState(true);
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useDecisionModal();

  useEffect(() => {
    if (showLoader) {
      document.querySelector('body')?.classList.add('overflow-hidden');
      Array.from(document.querySelectorAll('.blurMe') || []).map((p) =>
        p.classList.add('blur-xs', 'pointer-events-none')
      );
    } else {
      document.querySelector('body')?.classList.remove('overflow-hidden');
      Array.from(document.querySelectorAll('.blurMe') || []).map((p) =>
        p.classList.remove('blur-xs', 'pointer-events-none')
      );
    }
  }, [showLoader]);

  // Status 0 (pending) is only ever resolved by the payment provider's
  // webhook landing - if that's misconfigured or delayed, this would
  // otherwise spin behind a full-screen blocking overlay forever. Give up
  // after a couple of minutes and let the user back into the app instead of
  // trapping them here; the subscription still activates whenever the
  // webhook does eventually land, on the next page load.
  const MAX_ATTEMPTS = 120;
  const checkSubscription = useCallback(async (attempt = 0) => {
    const { status } = await (
      await fetch('/billing/check/' + props.check)
    ).json();
    if (status === 0) {
      if (attempt >= MAX_ATTEMPTS) {
        modal.open({
          title: 'Still confirming your payment',
          onlyApprove: true,
          approveLabel: 'OK',
          description:
            "This is taking longer than expected. Your payment is still being confirmed - if it went through, your plan will activate automatically within a few minutes. If you're not sure, please contact support.",
        });
        setShowLoader(false);
        return;
      }
      await timer(1000);
      return checkSubscription(attempt + 1);
    }
    if (status === 1) {
      modal.open({
        title: 'Invalid Payment',
        onlyApprove: true,
        approveLabel: 'OK',
        description:
          'We could not validate your payment method, please try again',
      });
      setShowLoader(false);
    }
    if (status === 2) {
      setShowLoader(false);
      props.mutate();
    }
  }, []);
  useEffect(() => {
    checkSubscription();
  }, []);
  if (showLoader) {
    return (
      <div className="fixed bg-black/40 w-full h-full flex justify-center items-center z-[400]">
        <div>
          <Loading type="spin" color="#612AD5" height={250} width={250} />
        </div>
      </div>
    );
  }
  return props.children;
};
