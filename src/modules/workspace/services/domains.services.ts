import {
  workspaceDomainCrud,
  workspaceDomainQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import {
  type Prisma,
  WorkspaceDomain,
  WorkspaceDomainStatus,
  WorkspaceDomainType,
} from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { resolveEntitlements } from '@/modules/entitlements/entitlement.services';
import { getWorkspaceActiveSubscriptionPlanSummary } from '@/modules/billing/services/subscription.services';

export type WorkspaceDomainDetailed = Prisma.WorkspaceDomainGetPayload<{
  select: {
    id: true;
    domain: true;
    type: true;
    routingMode: true;
    status: true;
    target: true;
    isPrimary: true;
    isVerified: true;
    createdAt: true;
    verifiedAt: true;
    lastCheckedAt: true;
    lastVerificationError: true;
    dnsRecords: {
      select: {
        id: true;
        type: true;
        purpose: true;
        host: true;
        expectedValue: true;
        isRequired: true;
        isMatched: true;
        matchedValue: true;
        lastCheckedAt: true;
        lastError: true;
      };
    };
  };
}>;

export type PlatformWorkspaceDomainAdminSnapshot = Prisma.WorkspaceDomainGetPayload<{
  select: {
    id: true;
    workspaceId: true;
    domain: true;
    type: true;
    routingMode: true;
    status: true;
    target: true;
    isPrimary: true;
    isVerified: true;
    verifiedAt: true;
    lastCheckedAt: true;
    lastVerificationError: true;
    createdAt: true;
    workspace: {
      select: {
        id: true;
        name: true;
        slug: true;
        isActive: true;
      };
    };
    dnsRecords: {
      select: {
        id: true;
        purpose: true;
        type: true;
        isRequired: true;
        isMatched: true;
      };
    };
  };
}>;

export type PlatformWorkspaceDomainAdminDetailSnapshot = Prisma.WorkspaceDomainGetPayload<{
  select: {
    id: true;
    workspaceId: true;
    domain: true;
    type: true;
    routingMode: true;
    status: true;
    target: true;
    isPrimary: true;
    isVerified: true;
    verifiedAt: true;
    lastCheckedAt: true;
    lastVerificationError: true;
    createdAt: true;
    workspace: {
      select: {
        id: true;
        name: true;
        slug: true;
        isActive: true;
        defaultDomain: true;
        primaryEmail: true;
      };
    };
    dnsRecords: {
      orderBy: [{ purpose: 'asc' }, { type: 'asc' }, { createdAt: 'asc' }];
      select: {
        id: true;
        type: true;
        purpose: true;
        host: true;
        expectedValue: true;
        isRequired: true;
        isMatched: true;
        matchedValue: true;
        lastCheckedAt: true;
        lastError: true;
      };
    };
  };
}>;

/**
 * Get domain by ID
 */
export async function getDomainById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Domain ID is required');

  const domain = await workspaceDomainQueries.findUnique({
    where: { id },
  });
  if (!domain) throwError(ERR.NOT_FOUND, 'Domain not found');

  return domain;
}

/**
 * Find domain
 */
export async function findDomain(domain: string) {
  if (!domain) throwError(ERR.INVALID_INPUT, 'Domain is required');

  return workspaceDomainQueries.findFirst({
    where: { domain: domain.toLowerCase() },
  });
}

/**
 * Resolve workspace by domain
 */
export async function resolveWorkspaceByDomain(domain: string) {
  if (!domain) throwError(ERR.INVALID_INPUT, 'Domain is required');

  return workspaceDomainQueries.findFirst({
    where: {
      domain: domain.toLowerCase(),
      isVerified: true,
      status: WorkspaceDomainStatus.VERIFIED,
    },
    include: { workspace: true },
  });
}

/**
 * List domains
 */
export async function listWorkspaceDomains(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return workspaceDomainQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function countWorkspaceDomains(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return workspaceDomainQueries.count({
    where: {
      workspaceId,
    },
  });
}

/**
 * Create domain
 */
export async function createWorkspaceDomain(
  data: CreateInput<'WorkspaceDomain'>,
) {
  if (!data?.workspaceId || !data?.domain) {
    throwError(ERR.INVALID_INPUT, 'Invalid domain data');
  }

  const normalized = data.domain.toLowerCase();

  const exists = await workspaceDomainQueries.findFirst({
    where: { domain: normalized },
  });

  if (exists) {
    throwError(ERR.ALREADY_EXISTS, 'Domain already exists');
  }

  try {
    return await workspaceDomainCrud.create({
      ...data,
      domain: normalized,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create domain', undefined, e);
  }
}

/**
 * Verify domain
 */
export async function verifyWorkspaceDomain(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Domain ID is required');

  try {
    return await workspaceDomainCrud.update(id, {
      isVerified: true,
      status: WorkspaceDomainStatus.VERIFIED,
      verifiedAt: new Date(),
      lastCheckedAt: new Date(),
      lastVerificationError: null,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to verify domain', undefined, e);
  }
}

export async function getWorkspaceDomainEntitlements(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const [activeSubscription, customDomainSetupCount] = await Promise.all([
    getWorkspaceActiveSubscriptionPlanSummary(workspaceId),
    workspaceDomainQueries.count({
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

export async function findPrimaryWorkspaceCustomDomain(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return workspaceDomainQueries.findFirst({
    where: {
      workspaceId,
      type: WorkspaceDomainType.CUSTOM,
      isPrimary: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      domain: true,
      type: true,
      workspaceId: true,
    },
  });
}

export async function findWorkspaceRedirectAlias(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return workspaceDomainQueries.findFirst({
    where: {
      workspaceId,
      type: WorkspaceDomainType.CUSTOM,
      isPrimary: false,
    },
    select: {
      id: true,
      domain: true,
      type: true,
      workspaceId: true,
    },
  });
}

export async function getWorkspaceDomainById(workspaceId: string, id: string) {
  if (!workspaceId || !id) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and id are required');
  }

  const domain = await workspaceDomainQueries.findFirst({
    where: {
      id,
      workspaceId,
    },
    select: {
      id: true,
      domain: true,
      type: true,
      workspaceId: true,
      isPrimary: true,
    },
  });

  if (!domain) {
    throwError(ERR.NOT_FOUND, 'Workspace domain not found');
  }

  return domain;
}

export async function listWorkspaceDomainsDetailed(
  workspaceId: string,
): Promise<WorkspaceDomainDetailed[]> {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const domains = await workspaceDomainQueries.many({
    where: {
      workspaceId,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      domain: true,
      type: true,
      routingMode: true,
      status: true,
      target: true,
      isPrimary: true,
      isVerified: true,
      createdAt: true,
      verifiedAt: true,
      lastCheckedAt: true,
      lastVerificationError: true,
      dnsRecords: {
        orderBy: [{ purpose: 'asc' }, { type: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          type: true,
          purpose: true,
          host: true,
          expectedValue: true,
          isRequired: true,
          isMatched: true,
          matchedValue: true,
          lastCheckedAt: true,
          lastError: true,
        },
      },
    },
  });

  return domains as unknown as WorkspaceDomainDetailed[];
}

export async function listPlatformWorkspaceDomainAdminSnapshots(opts?: {
  limit?: number;
}) {
  const domains = await workspaceDomainQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 250,
    select: {
      id: true,
      workspaceId: true,
      domain: true,
      type: true,
      routingMode: true,
      status: true,
      target: true,
      isPrimary: true,
      isVerified: true,
      verifiedAt: true,
      lastCheckedAt: true,
      lastVerificationError: true,
      createdAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      dnsRecords: {
        select: {
          id: true,
          purpose: true,
          type: true,
          isRequired: true,
          isMatched: true,
        },
      },
    },
  });

  return domains as PlatformWorkspaceDomainAdminSnapshot[];
}

export async function getPlatformWorkspaceDomainAdminSnapshot(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Domain ID is required');
  }

  const domain = await workspaceDomainQueries.delegate.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      workspaceId: true,
      domain: true,
      type: true,
      routingMode: true,
      status: true,
      target: true,
      isPrimary: true,
      isVerified: true,
      verifiedAt: true,
      lastCheckedAt: true,
      lastVerificationError: true,
      createdAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          defaultDomain: true,
          primaryEmail: true,
        },
      },
      dnsRecords: {
        orderBy: [{ purpose: 'asc' }, { type: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          type: true,
          purpose: true,
          host: true,
          expectedValue: true,
          isRequired: true,
          isMatched: true,
          matchedValue: true,
          lastCheckedAt: true,
          lastError: true,
        },
      },
    },
  });

  if (!domain) {
    throwError(ERR.NOT_FOUND, 'Workspace domain not found');
  }

  return domain as PlatformWorkspaceDomainAdminDetailSnapshot;
}

/**
 * Set primary domain
 */
export async function setPrimaryWorkspaceDomain(
  id: string,
  workspaceId: string,
) {
  if (!id || !workspaceId) {
    throwError(ERR.INVALID_INPUT, 'id and workspaceId required');
  }

  const domains = (await listWorkspaceDomains(
    workspaceId,
  )) as WorkspaceDomain[];

  const updates = domains.map((d) =>
    workspaceDomainCrud.update(d.id, {
      isPrimary: d.id === id,
    }),
  );

  return Promise.all(updates);
}

/**
 * Update domain
 */
export async function updateWorkspaceDomain(
  id: string,
  data: UpdateInput<'WorkspaceDomain'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Domain ID is required');

  const payload: UpdateInput<'WorkspaceDomain'> = { ...data };

  if (typeof payload.domain === 'string') {
    payload.domain = payload.domain.toLowerCase();
  }

  try {
    return await workspaceDomainCrud.update(id, payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update domain', undefined, e);
  }
}

/**
 * Delete domain
 */
export async function deleteWorkspaceDomain(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Domain ID is required');

  try {
    return await workspaceDomainCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete domain', undefined, e);
  }
}

/**
 * Check if exists
 */
export async function domainExists(domain: string) {
  if (!domain) throwError(ERR.INVALID_INPUT, 'Domain is required');

  return (
    (await workspaceDomainQueries.count({
      where: {
        domain: domain.toLowerCase(),
      },
    })) > 0
  );
}
