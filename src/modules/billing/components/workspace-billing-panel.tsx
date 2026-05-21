'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { changeWorkspacePlanAction } from '@/modules/billing/actions/change-workspace-plan.action';
import { navigateClientRedirect } from '@/lib/navigation/client-redirect';

type ActiveSubscription = {
  id: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  providerSubscriptionId: string | null;
  price: {
    id: string;
    amount: number;
    currency: string;
    interval: 'MONTHLY' | 'YEARLY' | null;
    productCode: string;
    productName: string;
    plan: {
      id: string;
      key: string;
      name: string;
      description: string | null;
      sortOrder: number;
    } | null;
  };
} | null;

type WorkspaceBillingPanelProps = {
  activeSubscription: ActiveSubscription;
  payments: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    paymentStatus: string;
    description: string | null;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    createdAt: string;
    capturedAt: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    status: string;
    issuedAt: string;
    paidAt: string | null;
    paymentId: string | null;
    providerInvoiceId: string | null;
  }>;
  oneTimeOffers: Array<{
    priceId: string;
    productCode: string;
    name: string;
    description: string;
    amount: number;
    currency: string;
  }>;
  billingConfig: {
    planCode?: string | null;
    subscriptionStatus?: string | null;
    trialStartsAt?: string | null;
    trialEndsAt?: string | null;
  } | null;
  canManageBilling: boolean;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function buildUpgradeHref(plan: 'pro' | 'business') {
  const search = new URLSearchParams({
    plan,
    planName: plan === 'pro' ? 'Pro' : 'Business',
    source: 'workspace-billing',
  });

  return `/payment?${search.toString()}`;
}

function buildOneTimePurchaseHref(priceId: string, productCode: string) {
  const search = new URLSearchParams({
    mode: 'one_time',
    priceId,
    productCode,
    source: 'workspace-billing',
  });

  return `/payment?${search.toString()}`;
}

function isCompletedPaymentStatus(status: string) {
  return status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED';
}

function formatPaymentStatus(status: string) {
  if (status === 'PENDING') {
    return 'Not Completed';
  }

  if (status === 'REQUIRES_ACTION') {
    return 'Requires Action';
  }

  return status;
}

export function WorkspaceBillingPanel({
  activeSubscription,
  payments,
  invoices,
  oneTimeOffers,
  billingConfig,
  canManageBilling,
}: WorkspaceBillingPanelProps) {
  const router = useRouter();
  const [isChangingPlan, startPlanChangeTransition] = useTransition();
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const completedPayments = payments.filter((payment) =>
    isCompletedPaymentStatus(payment.paymentStatus),
  );
  const incompleteAttempts = payments.filter(
    (payment) => !isCompletedPaymentStatus(payment.paymentStatus),
  );
  const currentPlanName =
    activeSubscription?.price.plan?.name ??
    (billingConfig?.planCode === 'pending_payment'
      ? 'Pending payment'
      : billingConfig?.planCode ?? 'No paid plan');
  const currentPlanKey = activeSubscription?.price.plan?.key ?? billingConfig?.planCode ?? 'trial';

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        router.refresh();
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [router]);

  const handleMoveToTrial = () => {
    setPlanMessage(null);
    setPlanError(null);

    startPlanChangeTransition(async () => {
      const response = await changeWorkspacePlanAction({
        targetPlanKey: 'trial',
        source: 'workspace-billing',
      });

      if (!response.success) {
        setPlanError(response.error.message);
        return;
      }

      setPlanMessage(response.data.successMessage);
      navigateClientRedirect(router, response.data.redirectTo);
    });
  };

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-accent/40 bg-background/90">
          <CardHeader className="pb-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
              Current Plan
            </p>
            <CardTitle className="text-primary">{currentPlanName}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-accent/40 bg-background/90">
          <CardHeader className="pb-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
              Subscription Status
            </p>
            <CardTitle className="text-primary">
              {activeSubscription?.status ?? billingConfig?.subscriptionStatus ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-accent/40 bg-background/90">
          <CardHeader className="pb-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
              Payments
            </p>
            <CardTitle className="text-primary">{payments.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-accent/40 bg-background/90">
          <CardHeader className="pb-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
              Invoices
            </p>
            <CardTitle className="text-primary">{invoices.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/70 bg-background/90">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Subscription</CardTitle>
            </div>
            {canManageBilling && (
              <div className="flex flex-wrap gap-2">
                {currentPlanKey === 'business' ? (
                  <>
                    <Button asChild variant="outline">
                      <Link href={buildUpgradeHref('pro')}>Change to Pro</Link>
                    </Button>
                    {isChangingPlan ? (
                      <SpinnerButton message="Moving to Trial..." />
                    ) : (
                      <Button type="button" variant="secondary" onClick={handleMoveToTrial}>
                        Move to Trial
                      </Button>
                    )}
                  </>
                ) : currentPlanKey === 'pro' ? (
                  <>
                    {isChangingPlan ? (
                      <SpinnerButton message="Moving to Trial..." />
                    ) : (
                      <Button type="button" variant="outline" onClick={handleMoveToTrial}>
                        Move to Trial
                      </Button>
                    )}
                    <Button asChild>
                      <Link href={buildUpgradeHref('business')}>Upgrade to Business</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline">
                      <Link href={buildUpgradeHref('pro')}>Upgrade to Pro</Link>
                    </Button>
                    <Button asChild>
                      <Link href={buildUpgradeHref('business')}>Upgrade to Business</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {planMessage && (
            <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-foreground">
              {planMessage}
            </div>
          )}
          {planError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {planError}
            </div>
          )}
          {activeSubscription ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-accent/40 bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
                  Product
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {activeSubscription.price.productName}
                </p>
              </div>
              <div className="rounded-xl border border-accent/40 bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
                  Amount
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {formatCurrency(
                    activeSubscription.price.amount,
                    activeSubscription.price.currency,
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-accent/40 bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
                  Current Period
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {formatDate(activeSubscription.currentPeriodStart)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  to {formatDate(activeSubscription.currentPeriodEnd)}
                </p>
              </div>
              <div className="rounded-xl border border-accent/40 bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">
                  Billing Cycle
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {activeSubscription.price.interval === 'YEARLY'
                    ? 'Yearly'
                    : activeSubscription.price.interval === 'MONTHLY'
                      ? 'Monthly'
                      : 'One-time'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-background p-6 text-sm text-muted-foreground">
              No active paid subscription is attached to this workspace yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/90">
        <CardHeader>
          <CardTitle>One-Time Add-Ons</CardTitle>
        </CardHeader>
        <CardContent>
          {oneTimeOffers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-background p-6 text-sm text-muted-foreground">
              No one-time add-ons are currently available in the seeded catalog.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {oneTimeOffers.map((offer) => (
                <div
                  key={offer.priceId}
                  className="rounded-xl border border-accent/40 bg-background p-5"
                >
                  <span className="inline-flex w-fit rounded-full border border-accent/40 bg-accent/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                    One-time purchase
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-primary">
                    {offer.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {offer.description}
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-primary">
                        {formatCurrency(offer.amount, offer.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">charged once</p>
                    </div>
                    {canManageBilling && (
                      <Button asChild size="sm">
                        <Link
                          href={buildOneTimePurchaseHref(
                            offer.priceId,
                            offer.productCode,
                          )}
                        >
                          Buy Now
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/90">
        <CardHeader>
          <CardTitle>Payment Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="completed">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="completed">
                Completed Payments ({completedPayments.length})
              </TabsTrigger>
              <TabsTrigger value="incomplete">
                Incomplete Attempts ({incompleteAttempts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="completed">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No completed payments recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    completedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{payment.description ?? 'Workspace payment'}</span>
                            {payment.providerPaymentId && (
                              <span className="text-xs text-muted-foreground">
                                {payment.providerPaymentId}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatPaymentStatus(payment.paymentStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="incomplete">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incompleteAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No incomplete checkout attempts are pending.
                      </TableCell>
                    </TableRow>
                  ) : (
                    incompleteAttempts.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{payment.description ?? 'Workspace payment'}</span>
                            {payment.providerOrderId && (
                              <span className="text-xs text-muted-foreground">
                                {payment.providerOrderId}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatPaymentStatus(payment.paymentStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/90">
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No invoices generated yet.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{invoice.invoiceNumber}</span>
                        {invoice.providerInvoiceId && (
                          <span className="text-xs text-muted-foreground">
                            {invoice.providerInvoiceId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{invoice.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                    <TableCell>{formatDate(invoice.paidAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
