import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import { attachPendingPaidBillingToWorkspaceWorkflow } from '@/modules/billing/workflows/attach-pending-paid-billing-to-workspace.workflow';
import { findActivePriceByProductCode } from '@/modules/billing/services/catalog.services';
import {
  invalidateWorkspaceActiveSubscriptionSummaryCache,
  invalidateWorkspaceBillingCaches,
} from '@/modules/billing/services/billing-cache.services';
import { createSubscription } from '@/modules/billing/services/subscription.services';
import { invalidateWorkspaceEntitlementsCache } from '@/modules/entitlements/services/entitlement-cache.services';
import { getWorkspaceOwnerRoleDefinition } from '@/modules/roles/services/role.services';
import type { WorkspaceRoleSystemKey } from '@/modules/roles/role.types';
import { createMembership } from '@/modules/workspace/services/membership.services';
import { createWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';
import {
  createWorkspace,
  findWorkspaceBySlug,
} from '@/modules/workspace/services/workspace.services';
import {
  buildDefaultWorkspaceSettings,
  FREE_TRIAL_DAYS,
  FREE_TRIAL_PRODUCT_CODE,
  getWorkspaceRootDomain,
} from '@/modules/workspace/defaults';

export async function createWorkspaceWorkflow(input: {
  identityId: string;
  workspaceName: string;
  workspaceSlug: string;
  intent?: 'free' | 'paid';
  pendingPriceId?: string;
  pendingPaymentId?: string;
  pendingSubscriptionId?: string;
}) {
  const result = await withUnitOfWork(async () => {
    const existing = await findWorkspaceBySlug(input.workspaceSlug);

    if (existing) {
      throwError(
        ERR.ALREADY_EXISTS,
        'Workspace slug already exists',
        undefined,
        {
          workspaceName: 'Try a different workspace name. This slug is already taken.',
        },
      );
    }

    const identity = await getIdentityById(input.identityId);
    const rootDomain = getWorkspaceRootDomain();
    const ownerRole = await getWorkspaceOwnerRoleDefinition();

    const workspace = await createWorkspace({
      name: input.workspaceName,
      slug: input.workspaceSlug,
      defaultDomain: rootDomain,
      primaryEmail: identity.email ?? undefined,
    });

    const membership = await createMembership({
      workspaceId: workspace.id,
      identityId: input.identityId,
      roleDefinitionId: ownerRole.id,
      roleKey: ownerRole.key,
      roleSystemKey:
        (ownerRole.systemKey as WorkspaceRoleSystemKey | null | undefined) ??
        undefined,
    });

    let trialStartsAt: Date | null = null;
    let trialEndsAt: Date | null = null;
    let subscriptionId: string | undefined;

    if (input.intent !== 'paid') {
      const { price } = await findActivePriceByProductCode({
        productCode: FREE_TRIAL_PRODUCT_CODE,
        interval: 'MONTHLY',
      });

      trialStartsAt = new Date();
      trialEndsAt = new Date(
        trialStartsAt.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000,
      );

      const subscription = await createSubscription({
        workspaceId: workspace.id,
        identityId: input.identityId,
        priceId: price.id,
        status: 'TRIALING',
        provider: 'RAZORPAY',
        currentPeriodStart: trialStartsAt,
        currentPeriodEnd: trialEndsAt,
        cancelAtPeriodEnd: false,
      });

      subscriptionId = subscription.id;
    }

    const defaults = buildDefaultWorkspaceSettings({
      name: workspace.name,
      slug: workspace.slug,
      intent: input.intent,
      trialStartsAt,
      trialEndsAt,
    });

    await createWorkspaceSettings({
      workspaceId: workspace.id,
      themes: defaults.themes,
      settings: defaults.settings,
    });

    if (input.intent === 'paid') {
      if (
        !input.pendingPriceId ||
        !input.pendingPaymentId ||
        !input.pendingSubscriptionId
      ) {
        throwError(
          ERR.INVALID_STATE,
          'Complete payment before creating a paid workspace.',
        );
      }

      await attachPendingPaidBillingToWorkspaceWorkflow({
        workspaceId: workspace.id,
        identityId: input.identityId,
        priceId: input.pendingPriceId,
        paymentId: input.pendingPaymentId,
        subscriptionId: input.pendingSubscriptionId,
        skipCacheInvalidation: true,
      });

      subscriptionId = input.pendingSubscriptionId;
    }
    return {
      workspaceId: workspace.id,
      membershipId: membership.id,
      roleDefinitionId: membership.roleDefinitionId,
      roleKey: membership.roleKey,
      roleSystemKey: membership.roleSystemKey,
      slug: workspace.slug,
      isActive: workspace.isActive,
      subscriptionId,
    };
  });
  await invalidateWorkspaceActiveSubscriptionSummaryCache(result.workspaceId);
  await invalidateWorkspaceEntitlementsCache(result.workspaceId);
  const routing = await syncWorkspaceRoutingState(result.workspaceId);
  await invalidateWorkspaceBillingCaches(result.workspaceId);

  return {
    ...result,
    primaryDomain: routing.primaryHost,
    routingStrategy: routing.strategy,
    intent: routing.intent,
  };
}
