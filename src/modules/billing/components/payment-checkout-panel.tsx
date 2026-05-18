'use client';

import { useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import {
  CreditCardIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { createBillingCheckoutAction } from '@/modules/billing/actions/create-billing-checkout.action';
import { recordBillingPaymentFailureAction } from '@/modules/billing/actions/record-billing-payment-failure.action';
import { verifyBillingPaymentAction } from '@/modules/billing/actions/verify-billing-payment.action';
import type { BillingCheckoutSource } from '@/modules/billing/schema';
import { navigateClientRedirect } from '@/lib/navigation/client-redirect';

type ReadySubscriptionData = {
  state: 'ready';
  mode: 'subscription';
  source: BillingCheckoutSource | null;
  upgrade: string | null;
  upgradeLabel: string | null;
  clientKey: string;
  title: string;
  description: string;
  prefill: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  plan: {
    key: string;
    name: string;
    description: string;
  };
  options: Array<{
    priceId: string;
    interval: 'MONTHLY' | 'YEARLY' | null;
    intervalLabel: string | null;
    amount: number;
    amountLabel: string;
    currency: string;
    productCode: string;
    productName: string;
  }>;
  selectedPriceId: string | null;
  selectedPlanName: string;
};

type ReadyOneTimeData = {
  state: 'ready';
  mode: 'one_time';
  source: BillingCheckoutSource | null;
  upgrade: string | null;
  upgradeLabel: string | null;
  clientKey: string;
  title: string;
  description: string;
  prefill: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  product: {
    priceId: string;
    productCode: string;
    name: string;
    description: string;
    amount: number;
    amountLabel: string;
    currency: string;
  };
};

type CompletedPendingWorkspaceData = {
  state: 'completed_pending_workspace';
  mode: 'subscription';
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  prefill: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

type PaymentCheckoutPanelProps =
  | ReadySubscriptionData
  | ReadyOneTimeData
  | CompletedPendingWorkspaceData;

type PaymentCheckoutPanelSurfaceProps = {
  embedded?: boolean;
  workspaceSurface?: boolean;
};

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      payment_id?: string;
      order_id?: string;
      subscription_id?: string;
    };
  };
};

type RazorpayInstance = {
  open: () => void;
  on?: (event: string, callback: (response: RazorpayFailureResponse) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function intervalBadge(interval?: 'MONTHLY' | 'YEARLY' | null) {
  if (interval === 'YEARLY') {
    return 'Yearly';
  }

  if (interval === 'MONTHLY') {
    return 'Monthly';
  }

  return 'One-time';
}

export function PaymentCheckoutPanel(
  props: PaymentCheckoutPanelProps & PaymentCheckoutPanelSurfaceProps,
) {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && !!window.Razorpay,
  );
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hadCheckoutFailure, setHadCheckoutFailure] = useState(false);
  const [pendingFailureMessage, setPendingFailureMessage] = useState<string | null>(null);
  const checkoutFailureMessageRef = useRef<string | null>(null);
  const hadCheckoutFailureRef = useRef(false);
  const isRecordingFailureRef = useRef(false);
  const [selectedPriceId, setSelectedPriceId] = useState(
    props.state === 'ready' && props.mode === 'subscription'
      ? props.selectedPriceId
      : props.state === 'ready' && props.mode === 'one_time'
        ? props.product.priceId
        : null,
  );

  const selectedSubscriptionOption = useMemo(() => {
    if (props.state !== 'ready' || props.mode !== 'subscription') {
      return null;
    }

    return (
      props.options.find((option) => option.priceId === selectedPriceId) ??
      props.options[0] ??
      null
    );
  }, [props, selectedPriceId]);

  const checkoutButtonLabel = hadCheckoutFailure
    ? 'Retry payment'
    : 'Continue to Razorpay';
  const cardClassName = props.workspaceSurface
    ? 'border border-[var(--workspace-accent-border-light)] bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
    : 'border-border/70 bg-background/90';
  const secondaryCardClassName = props.workspaceSurface
    ? 'border border-[var(--workspace-accent-border-light)] bg-white/88 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]'
    : 'border-border/70 bg-background/90';
  const primaryButtonClassName = props.workspaceSurface
    ? 'w-full sm:w-auto bg-[var(--workspace-primary)] text-[var(--workspace-primary-foreground)] hover:opacity-95'
    : 'w-full sm:w-auto';
  const spinnerClassName = props.workspaceSurface
    ? 'w-full sm:w-auto bg-[var(--workspace-primary)] text-[var(--workspace-primary-foreground)] hover:opacity-95'
    : 'w-full sm:w-auto';
  const summaryBlockClassName = props.workspaceSurface
    ? 'rounded-xl border border-[var(--workspace-accent-border-light)] bg-[var(--workspace-accent-soft-light)]/70 p-4 dark:border-white/10 dark:bg-white/6'
    : 'rounded-xl border border-accent/40 bg-background p-4';

  if (props.state === 'completed_pending_workspace') {
    const completedCard = (
      <Card className={`w-full max-w-2xl ${cardClassName}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2Icon className="size-5 text-accent" />
            <CardTitle>{props.title}</CardTitle>
          </div>
          <CardDescription>{props.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push(props.ctaHref)}>
            {props.ctaLabel}
            <ArrowRightIcon className="ml-2 size-4" />
          </Button>
        </CardContent>
      </Card>
    );

    if (props.embedded) {
      return <div className="w-full">{completedCard}</div>;
    }

    return (
      <section className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        {completedCard}
      </section>
    );
  }

  const startCheckout = async () => {
    setError(null);
    setMessage(null);
    setHadCheckoutFailure(false);
    setPendingFailureMessage(null);
    checkoutFailureMessageRef.current = null;
    hadCheckoutFailureRef.current = false;
    isRecordingFailureRef.current = false;

    if (!scriptReady || !window.Razorpay) {
      setError('Razorpay checkout is still loading. Please try again in a moment.');
      return;
    }

    if (props.mode === 'subscription' && !selectedSubscriptionOption) {
      setError('Select a subscription option before continuing.');
      return;
    }

    setBusyMessage('Preparing secure checkout...');

    const checkoutResponse = await createBillingCheckoutAction(
      props.mode === 'subscription'
        ? {
            mode: 'subscription',
            planKey: props.plan.key,
            priceId: selectedSubscriptionOption!.priceId,
            interval: selectedSubscriptionOption!.interval ?? undefined,
            source: props.source ?? undefined,
            upgrade: props.upgrade ?? undefined,
          }
        : {
            mode: 'one_time',
            priceId: props.product.priceId,
            productCode: props.product.productCode,
            source: props.source ?? undefined,
            upgrade: props.upgrade ?? undefined,
          },
    );

    if (!checkoutResponse.success) {
      setBusyMessage(null);
      setError(checkoutResponse.error.message);
      return;
    }

    const checkout = checkoutResponse.data;

    if (checkout.kind === 'direct_upgrade') {
      setBusyMessage('Applying prorated upgrade...');
      setMessage(checkout.successMessage ?? 'Upgrade applied successfully.');
      navigateClientRedirect(
        router,
        checkout.redirectTo ?? '/app/billing',
      );
      return;
    }

    const checkoutPayload = checkout.checkout!;

    const razorpay = new window.Razorpay({
      key: checkoutPayload.key,
      amount: checkoutPayload.amount,
      currency: checkoutPayload.currency,
      name: checkoutPayload.name,
      description: checkoutPayload.description,
      order_id: checkoutPayload.orderId,
      subscription_id: checkoutPayload.subscriptionId,
      prefill: {
        name: checkoutPayload.prefill.name,
        email: checkoutPayload.prefill.email,
        contact: checkoutPayload.prefill.contact,
      },
      notes: checkoutPayload.notes,
      retry: {
        enabled: false,
      },
      theme: {
        color: '#2563eb',
      },
      modal: {
        handleback: false,
        ondismiss: () => {
          if (hadCheckoutFailureRef.current && isRecordingFailureRef.current) {
            setHadCheckoutFailure(true);
            setPendingFailureMessage(checkoutFailureMessageRef.current);
            setBusyMessage('Updating failed payment status...');
            return;
          }

          setBusyMessage(null);
        },
      },
      handler: async (response: RazorpaySuccessResponse) => {
        setBusyMessage('Verifying payment...');

        const verifyResponse = await verifyBillingPaymentAction({
          paymentId: checkout.paymentId,
          mode: checkout.mode,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySubscriptionId: response.razorpay_subscription_id,
          razorpaySignature: response.razorpay_signature,
          source: props.source ?? undefined,
        });

        if (!verifyResponse.success) {
          setBusyMessage(null);
          setError(verifyResponse.error.message);
          return;
        }

        setMessage(verifyResponse.data.successMessage);
        navigateClientRedirect(router, verifyResponse.data.redirectTo);
      },
    });

    razorpay.on?.('payment.failed', async (response) => {
      const description =
        response.error?.description ??
        'Payment failed. Please try again or use a different payment method.';

      checkoutFailureMessageRef.current = description;
      hadCheckoutFailureRef.current = true;
      isRecordingFailureRef.current = true;

      setMessage(null);
      setHadCheckoutFailure(true);
      setError(null);
      setPendingFailureMessage(description);
      setBusyMessage('Updating failed payment status...');

      const failureResponse = await recordBillingPaymentFailureAction({
        paymentId: checkout.paymentId,
        mode: checkout.mode,
        razorpayPaymentId: response.error?.metadata?.payment_id,
        razorpayOrderId:
          response.error?.metadata?.order_id ?? checkoutPayload.orderId,
        razorpaySubscriptionId:
          response.error?.metadata?.subscription_id ?? checkoutPayload.subscriptionId,
        errorCode: response.error?.code,
        errorDescription: description,
        errorSource: response.error?.source,
        errorStep: response.error?.step,
        errorReason: response.error?.reason,
      });

      if (!failureResponse.success) {
        console.error('Failed to record Razorpay payment failure', failureResponse.error);
      }

      isRecordingFailureRef.current = false;
      setBusyMessage(null);
      setPendingFailureMessage(null);
      setError(description);
    });

    setBusyMessage(null);
    razorpay.open();
  };

  return (
    <section
      className={
        props.embedded
          ? 'w-full'
          : 'flex min-h-svh w-full items-center justify-center p-6 md:p-10'
      }
    >
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className={cardClassName}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {props.mode === 'subscription' ? 'Subscription' : 'One-Time'}
              </Badge>
              {props.upgradeLabel && <Badge variant="outline">{props.upgradeLabel}</Badge>}
            </div>
            <CardTitle className="mt-3">{props.title}</CardTitle>
            <CardDescription className="mt-2">{props.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingFailureMessage && (
              <Alert className="border-accent/40 bg-accent/10 text-accent-foreground">
                <AlertTitle className="flex items-center gap-2">
                  <Loader2Icon className="size-4 animate-spin" />
                  Payment failed
                </AlertTitle>
                <AlertDescription>
                  We are updating your failed payment attempt so you can retry safely in a
                  moment.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Payment could not continue</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <AlertTitle>Payment update</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {props.mode === 'subscription' ? (
              <div className="grid gap-3">
                {props.upgrade && (
                  <Alert>
                    <AlertTitle>Upgrade billing policy</AlertTitle>
                    <AlertDescription>
                      Card mandates keep the current renewal date and charge only
                      the prorated difference. UPI and eMandate upgrades restart
                      the subscription today and refund the unused portion of the
                      current cycle.
                    </AlertDescription>
                  </Alert>
                )}

                {props.options.map((option) => {
                  const selected = option.priceId === selectedPriceId;

                  return (
                    <button
                      key={option.priceId}
                      type="button"
                      onClick={() => setSelectedPriceId(option.priceId)}
                      className={[
                        'rounded-xl border p-4 text-left transition-colors',
                        selected
                          ? props.workspaceSurface
                            ? 'border-[var(--workspace-primary)] bg-[var(--workspace-accent-soft-light)]/75 dark:bg-white/8'
                            : 'border-primary bg-primary/5'
                          : props.workspaceSurface
                            ? 'border-[var(--workspace-accent-border-light)] bg-white/80 hover:border-[var(--workspace-primary)]/45 dark:border-white/10 dark:bg-white/4'
                            : 'border-border/70 bg-background hover:border-accent/60',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{intervalBadge(option.interval)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {option.productName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold text-primary">
                            {option.amountLabel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            billed {option.intervalLabel ?? 'once'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={summaryBlockClassName}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{props.product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {props.product.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-primary">
                      {props.product.amountLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">one-time</p>
                  </div>
                </div>
              </div>
            )}

            {busyMessage ? (
              <SpinnerButton message={busyMessage} className={spinnerClassName} />
            ) : (
              <Button
                onClick={startCheckout}
                disabled={!scriptReady}
                className={primaryButtonClassName}
              >
                <CreditCardIcon className="mr-2 size-4" />
                {checkoutButtonLabel}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={secondaryCardClassName}>
          <CardHeader>
            <CardTitle>Checkout Summary</CardTitle>
            <CardDescription>
              Review what will be charged before you continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={summaryBlockClassName}>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
                Customer
              </p>
              <p className="mt-2 text-sm font-medium text-primary">
                {props.prefill.name ?? 'Account holder'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {props.prefill.email ?? 'No email on file'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {props.prefill.phone ?? 'No phone on file'}
              </p>
            </div>

            <div className={summaryBlockClassName}>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
                Charge
              </p>
              <p className="mt-2 text-lg font-semibold text-primary">
                {props.mode === 'subscription'
                  ? selectedSubscriptionOption?.amountLabel ?? 'Select a price'
                  : props.product.amountLabel}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {props.mode === 'subscription'
                  ? `${intervalBadge(selectedSubscriptionOption?.interval)} subscription`
                  : 'One-time purchase'}
              </p>
            </div>

            <Alert>
              <AlertTitle>Secure payment</AlertTitle>
              <AlertDescription>
                Payment collection happens inside Razorpay Checkout. We verify the
                signature on our server before activating billing in the app.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
