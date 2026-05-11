import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import { findActivePriceByProductCode } from '@/modules/billing/services/catalog.services';
import { createSubscription } from '@/modules/billing/services/subscription.services';
import { getWorkspaceOwnerRoleDefinition } from '@/modules/roles/role.services';
import { createMembership } from '@/modules/workspace/services/membership.services';
import { createWorkspaceSettings } from '@/modules/workspace/services/setting.services';
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
}) {
  return withUnitOfWork(async () => {
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
      roleSystemKey: ownerRole.systemKey ?? undefined,
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

    return {
      workspaceId: workspace.id,
      membershipId: membership.id,
      roleDefinitionId: membership.roleDefinitionId,
      roleKey: membership.roleKey,
      roleSystemKey: membership.roleSystemKey,
      slug: workspace.slug,
      isActive: workspace.isActive,
      primaryDomain: workspace.defaultDomain,
      subscriptionId,
    };
  });
}
