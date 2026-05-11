'use server';

import {
  WorkspaceDomainType,
  type SubscriptionStatus,
} from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { prisma } from '@/lib/prisma';
import { resolveEntitlements } from '@/modules/entitlements/entitlement.services';
import { assertPermission } from '@/modules/permissions/permissions.services';
import {
  createWorkspaceCustomDomainActionSchema,
  createWorkspaceCustomDomainSchema,
  type CreateWorkspaceCustomDomainActionInput,
  type CreateWorkspaceCustomDomainDomain,
} from '@/modules/workspace/schema';
import { createWorkspaceCustomDomainWorkflow } from '@/modules/workspace/workflows/create-workspace-custom-domain.workflow';

async function getWorkspaceDomainEntitlements(workspaceId: string) {
  const [activeSubscription, customDomainSetupCount] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        workspaceId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] satisfies SubscriptionStatus[],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        price: {
          select: {
            product: {
              select: {
                plan: {
                  select: {
                    id: true,
                    key: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.workspaceDomain.count({
      where: {
        workspaceId,
        type: WorkspaceDomainType.CUSTOM,
        isPrimary: true,
      },
    }),
  ]);

  const activePlan = activeSubscription?.price?.product?.plan ?? null;
  const entitlements = await resolveEntitlements({
    workspaceId,
    planId: activePlan?.id,
  });

  return {
    activePlan,
    customDomainSetupCount,
    entitlements,
  };
}

const createWorkspaceCustomDomainActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: CreateWorkspaceCustomDomainActionInput =
      createWorkspaceCustomDomainActionSchema.parse(raw);
    const input: CreateWorkspaceCustomDomainDomain =
      createWorkspaceCustomDomainSchema.parse(parsed);

    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'workspaceDomain.create');

    const { customDomainSetupCount, entitlements } =
      await getWorkspaceDomainEntitlements(session.workspaceId);
    const customDomainSlots = entitlements.limits.max_custom_domains ?? 0;
    const hasCustomDomainFeature =
      entitlements.features.includes('domain_custom') || customDomainSlots > 0;

    if (!hasCustomDomainFeature) {
      throwError(
        ERR.FORBIDDEN,
        'White-label custom domains are not enabled on this workspace plan',
      );
    }

    if (
      customDomainSlots > 0 &&
      customDomainSetupCount >= customDomainSlots
    ) {
      throwError(
        ERR.INVALID_STATE,
        `White-label setup limit reached for this workspace (${customDomainSlots})`,
      );
    }

    const result = await createWorkspaceCustomDomainWorkflow({
      workspaceId: session.workspaceId,
      domain: input.domain,
      routingMode: input.routingMode,
    });

    return {
      successMessage:
        'Custom domain added. Finish the DNS records below and then run a verification check.',
      domain: {
        id: result.domain.id,
        domain: result.domain.domain,
        routingMode: result.domain.routingMode,
        status: result.domain.status,
        isPrimary: result.domain.isPrimary,
      },
      dnsRecords: result.dnsRecords.map((record) => ({
        id: record.id,
        type: record.type,
        purpose: record.purpose,
        host: record.host,
        expectedValue: record.expectedValue,
        isRequired: record.isRequired,
      })),
    };
  },
);

export async function createWorkspaceCustomDomainAction(formData: FormData) {
  return createWorkspaceCustomDomainActionImpl(formData);
}
