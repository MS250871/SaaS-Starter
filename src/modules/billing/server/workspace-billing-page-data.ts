import { withActionTxContext } from '@/lib/request/withActionContext';
import { listActiveOneTimePurchaseOffers } from '@/modules/billing/services/catalog.services';
import { listWorkspaceInvoices } from '@/modules/billing/services/invoice.services';
import { listWorkspacePayments } from '@/modules/billing/services/payment.services';
import {
  getWorkspaceActiveSubscriptionPlanSummary,
  listWorkspaceSubscriptions,
} from '@/modules/billing/services/subscription.services';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

export async function getWorkspaceBillingPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId) {
      return {
        actor: context.actor,
        workspaceId: null,
        activeSubscription: null,
        subscriptions: [],
        payments: [],
        invoices: [],
        oneTimeOffers: [],
        billingConfig: null,
      };
    }

    const [
      activeSubscription,
      subscriptions,
      payments,
      invoices,
      oneTimeOffers,
    ] = await Promise.all([
      getWorkspaceActiveSubscriptionPlanSummary(context.workspaceId),
      listWorkspaceSubscriptions(context.workspaceId),
      listWorkspacePayments(context.workspaceId),
      listWorkspaceInvoices(context.workspaceId),
      listActiveOneTimePurchaseOffers(),
    ]);

    const billingConfig = (
      context.settings?.settings as {
        billing?: {
          planCode?: string | null;
          subscriptionStatus?: string | null;
          trialStartsAt?: string | null;
          trialEndsAt?: string | null;
        };
      } | null
    )?.billing ?? null;

    return {
      actor: context.actor,
      workspaceId: context.workspaceId,
      activeSubscription: activeSubscription
        ? {
            id: activeSubscription.id,
            status: activeSubscription.status,
            currentPeriodStart:
              activeSubscription.currentPeriodStart?.toISOString() ?? null,
            currentPeriodEnd:
              activeSubscription.currentPeriodEnd?.toISOString() ?? null,
            providerSubscriptionId:
              activeSubscription.providerSubscriptionId ?? null,
            price: {
              id: activeSubscription.price.id,
              amount: Number(activeSubscription.price.amount),
              currency: activeSubscription.price.currency,
              interval: activeSubscription.price.interval,
              productCode: activeSubscription.price.product.code,
              productName: activeSubscription.price.product.name,
              plan: activeSubscription.price.product.plan
                ? {
                    id: activeSubscription.price.product.plan.id,
                    key: activeSubscription.price.product.plan.key,
                    name: activeSubscription.price.product.plan.name,
                    description:
                      activeSubscription.price.product.plan.description ?? null,
                    sortOrder: activeSubscription.price.product.plan.sortOrder,
                  }
                : null,
            },
          }
        : null,
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        status: subscription.status,
        priceId: subscription.priceId,
        workspaceId: subscription.workspaceId ?? null,
        identityId: subscription.identityId ?? null,
        provider: subscription.provider,
        providerSubscriptionId: subscription.providerSubscriptionId ?? null,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        createdAt: subscription.createdAt.toISOString(),
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        type: payment.type,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentStatus: payment.paymentStatus,
        description: payment.description ?? null,
        providerOrderId: payment.providerOrderId ?? null,
        providerPaymentId: payment.providerPaymentId ?? null,
        createdAt: payment.createdAt.toISOString(),
        capturedAt: payment.capturedAt?.toISOString() ?? null,
      })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        status: invoice.status,
        issuedAt: invoice.issuedAt.toISOString(),
        paidAt: invoice.paidAt?.toISOString() ?? null,
        paymentId: invoice.paymentId ?? null,
        providerInvoiceId: invoice.providerInvoiceId ?? null,
      })),
      oneTimeOffers: oneTimeOffers.map((offer) => ({
        priceId: offer.priceId,
        productCode: offer.productCode,
        name: offer.name,
        description: offer.description,
        amount: offer.amount,
        currency: offer.currency,
      })),
      billingConfig,
    };
  });
}
