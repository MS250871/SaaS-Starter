import type {
  SessionAccess,
  SessionClaims,
  SessionPayload,
} from '@/lib/auth/auth.schema';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getWorkspaceActiveSubscriptionPlanSummary } from '@/modules/billing/services/subscription.services';
import { resolveEntitlements } from '@/modules/entitlements/entitlement.services';
import { resolvePermissions } from '@/modules/permissions/permissions.services';

export async function resolveSessionAccess(
  claims: SessionClaims,
): Promise<SessionAccess> {
  return withUnitOfWork(async () => {
    const permissions = claims.identityId
      ? await resolvePermissions({
          identityId: claims.identityId,
          workspaceId: claims.workspaceId,
          workspaceRoleDefinitionId: claims.workspaceRoleId,
          platformRoleDefinitionIds: claims.platformRoleIds ?? [],
        })
      : [];

    if (!claims.workspaceId) {
      return {
        permissions,
        features: [],
        limits: {},
      };
    }

    const activeSubscription =
      await getWorkspaceActiveSubscriptionPlanSummary(claims.workspaceId);
    const planId = activeSubscription?.price.product.plan?.id;
    const entitlements = await resolveEntitlements({
      workspaceId: claims.workspaceId,
      planId,
    });

    return {
      permissions,
      features: entitlements.features,
      limits: entitlements.limits,
    };
  });
}

export async function hydrateSessionClaims(
  claims: SessionClaims,
): Promise<SessionPayload> {
  const access = await resolveSessionAccess(claims);

  return {
    ...claims,
    permissions: access.permissions,
    features: access.features,
    limits: access.limits,
  };
}
