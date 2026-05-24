import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { invalidateWorkspaceBillingCaches } from '@/modules/billing/services/billing-cache.services';
import { invalidateWorkspaceEntitlementsCache } from '@/modules/entitlements/services/entitlement-cache.services';
import { getPriceCheckoutSnapshotById } from '@/modules/billing/services/catalog.services';
import {
  findInvoiceByPaymentId,
  updateInvoice,
} from '@/modules/billing/services/invoice.services';
import { getPaymentById, updatePayment } from '@/modules/billing/services/payment.services';
import {
  getSubscriptionById,
  updateSubscription,
} from '@/modules/billing/services/subscription.services';
import { syncWorkspaceBillingSettings } from '@/modules/workspace/services/setting.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';

export async function attachPendingPaidBillingToWorkspaceWorkflow(params: {
  workspaceId: string;
  identityId: string;
  paymentId: string;
  subscriptionId: string;
  priceId: string;
  skipCacheInvalidation?: boolean;
}) {
  if (
    !params.workspaceId ||
    !params.identityId ||
    !params.paymentId ||
    !params.subscriptionId ||
    !params.priceId
  ) {
    throwError(
      ERR.INVALID_INPUT,
      'workspaceId, identityId, paymentId, subscriptionId and priceId are required',
    );
  }

  const result = await withUnitOfWork(async () => {
    const [payment, subscription, priceSnapshot] = await Promise.all([
      getPaymentById(params.paymentId),
      getSubscriptionById(params.subscriptionId),
      getPriceCheckoutSnapshotById(params.priceId),
    ]);

    if (payment.identityId !== params.identityId) {
      throwError(ERR.FORBIDDEN, 'Payment does not belong to this identity.');
    }

    if (subscription.identityId !== params.identityId) {
      throwError(ERR.FORBIDDEN, 'Subscription does not belong to this identity.');
    }

    if (payment.paymentStatus !== 'SUCCESS') {
      throwError(ERR.INVALID_STATE, 'Payment is not completed yet.');
    }

    await Promise.all([
      updatePayment(payment.id, {
        workspaceId: params.workspaceId,
      }),
      updateSubscription(subscription.id, {
        workspaceId: params.workspaceId,
      }),
    ]);

    const invoice = await findInvoiceByPaymentId(payment.id);

    if (invoice && invoice.workspaceId !== params.workspaceId) {
      await updateInvoice(invoice.id, {
        workspaceId: params.workspaceId,
      });
    }

    if (!priceSnapshot.product.plan?.key) {
      throwError(ERR.INVALID_STATE, 'Paid subscription plan metadata is missing.');
    }

    await syncWorkspaceBillingSettings({
      workspaceId: params.workspaceId,
      planCode: priceSnapshot.product.plan.key,
      subscriptionStatus: subscription.status,
    });

    return {
      paymentId: payment.id,
      subscriptionId: subscription.id,
      planKey: priceSnapshot.product.plan.key,
    };
  });

  if (!params.skipCacheInvalidation) {
    await invalidateWorkspaceEntitlementsCache(params.workspaceId);
    await syncWorkspaceRoutingState(params.workspaceId);
    await invalidateWorkspaceBillingCaches(params.workspaceId);
  }

  return result;
}
