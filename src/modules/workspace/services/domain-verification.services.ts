import {
  type Prisma,
  WorkspaceDomainType,
  type WorkspaceDomainRoutingMode,
} from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getWorkspaceRootDomain } from '@/modules/workspace/defaults';
import {
  createWorkspaceDomain,
  findDomain,
  updateWorkspaceDomain,
} from '@/modules/workspace/services/domains.services';
import type { ManagedWorkspaceDomainState } from '@/modules/workspace/services/domain-provider.types';
import {
  getWorkspaceSettings,
  updateWorkspaceConfig,
} from '@/modules/workspace/services/setting.services';
import { updateWorkspace } from '@/modules/workspace/services/workspace.services';
import {
  workspaceDomainDnsRecordCrud,
  workspaceDomainQueries,
  workspaceQueries,
} from '@/modules/workspace/db';

type WorkspaceDomainRedirectAlias = {
  domain: string;
  redirectTo: string;
  redirectStatusCode: 301 | 302 | 307 | 308;
  verified: boolean;
};

export type WorkspaceCustomDomainVerificationSnapshot =
  Prisma.WorkspaceDomainGetPayload<{
    include: {
      dnsRecords: true;
      workspace: {
        select: {
          id: true;
          slug: true;
          isActive: true;
          defaultDomain: true;
        };
      };
    };
  }>;

function normalizeDomainValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

export function normalizeWorkspaceCustomDomain(value: string) {
  const normalized = normalizeDomainValue(value);

  if (!normalized) {
    throwError(ERR.INVALID_INPUT, 'Custom domain is required');
  }

  if (!/^[a-z0-9.-]+$/.test(normalized) || !normalized.includes('.')) {
    throwError(ERR.INVALID_INPUT, 'Enter a valid custom domain');
  }

  const rootDomain = getWorkspaceRootDomain().toLowerCase();

  if (normalized === rootDomain || normalized.endsWith(`.${rootDomain}`)) {
    throwError(
      ERR.INVALID_INPUT,
      'Use an external custom domain here. Platform-root subdomains belong to the Pro routing flow.',
    );
  }

  return normalized;
}

function normalizeRedirectStatusCode(value: unknown): 301 | 302 | 307 | 308 {
  if (value === 301 || value === 302 || value === 307 || value === 308) {
    return value;
  }

  return 308;
}

function normalizeRedirectAliases(value: unknown): WorkspaceDomainRedirectAlias[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const domain =
        typeof item.domain === 'string' ? normalizeDomainValue(item.domain) : '';
      const redirectTo =
        typeof item.redirectTo === 'string'
          ? normalizeDomainValue(item.redirectTo)
          : '';

      if (!domain || !redirectTo) {
        return null;
      }

      return {
        domain,
        redirectTo,
        redirectStatusCode: normalizeRedirectStatusCode(
          'redirectStatusCode' in item ? item.redirectStatusCode : undefined,
        ),
        verified:
          'verified' in item && typeof item.verified === 'boolean'
            ? item.verified
            : false,
      } satisfies WorkspaceDomainRedirectAlias;
    })
    .filter((item): item is WorkspaceDomainRedirectAlias => Boolean(item));
}

function syncRedirectAliases(params: {
  currentValue: unknown;
  domain: string;
  redirectTo?: string | null;
  redirectStatusCode?: 301 | 302 | 307 | 308 | null;
  verified: boolean;
}) {
  const aliases = normalizeRedirectAliases(params.currentValue).filter(
    (alias) => alias.domain !== params.domain,
  );

  if (!params.redirectTo) {
    return aliases;
  }

  return [
    ...aliases,
    {
      domain: params.domain,
      redirectTo: normalizeDomainValue(params.redirectTo),
      redirectStatusCode: normalizeRedirectStatusCode(
        params.redirectStatusCode,
      ),
      verified: params.verified,
    },
  ];
}

function resolveManagedDomainSettings(params: {
  currentDomainSettings: Record<string, unknown>;
  domain: string;
  isPrimary: boolean;
  verified: boolean;
  redirectTarget?: string | null;
  redirectStatusCode?: 301 | 302 | 307 | 308 | null;
  fallbackPrimaryHost?: string | null;
}) {
  const existingCustomDomain =
    typeof params.currentDomainSettings.customDomain === 'string'
      ? params.currentDomainSettings.customDomain
      : null;
  const currentPrimaryHost =
    typeof params.currentDomainSettings.primaryHost === 'string'
      ? params.currentDomainSettings.primaryHost
      : params.fallbackPrimaryHost ?? null;
  const redirectAliases = syncRedirectAliases({
    currentValue: params.currentDomainSettings.redirectAliases,
    domain: params.domain,
    redirectTo: params.redirectTarget,
    redirectStatusCode: params.redirectStatusCode,
    verified: params.verified,
  });

  if (params.redirectTarget) {
    return {
      ...params.currentDomainSettings,
      redirectAliases,
    };
  }

  return {
    ...params.currentDomainSettings,
    strategy: params.verified ? 'custom_domain' : 'custom_domain_pending',
    customDomain:
      params.isPrimary || !existingCustomDomain
        ? params.domain
        : existingCustomDomain,
    customDomainVerified: params.isPrimary
      ? params.verified
      : params.verified || Boolean(params.currentDomainSettings.customDomainVerified),
    primaryHost:
      params.isPrimary && params.verified
        ? params.domain
        : currentPrimaryHost ?? params.domain,
    redirectAliases,
  };
}

async function replaceWorkspaceDomainDnsRecords(params: {
  workspaceDomainId: string;
  records: ManagedWorkspaceDomainState['dnsRecords'];
  checkedAt: Date;
}) {
  await workspaceDomainDnsRecordCrud.delegate.deleteMany({
    where: {
      workspaceDomainId: params.workspaceDomainId,
    },
  });

  const createdRecords = [];

  for (const record of params.records) {
    const created = await workspaceDomainDnsRecordCrud.create({
      workspaceDomainId: params.workspaceDomainId,
      type: record.type,
      purpose: record.purpose,
      host: record.host,
      expectedValue: record.expectedValue,
      isRequired: record.isRequired,
      isMatched: record.matched,
      matchedValue: record.matchedValue ?? null,
      lastCheckedAt: params.checkedAt,
      lastError: record.lastError ?? null,
    });

    createdRecords.push(created);
  }

  return createdRecords;
}

async function applyManagedDomainStateToWorkspace(params: {
  workspaceId: string;
  workspaceDomainId: string;
  domain: string;
  isPrimary: boolean;
  managedState: ManagedWorkspaceDomainState;
  workspace: {
    id: string;
    slug: string;
    isActive: boolean;
    defaultDomain: string | null;
  };
}) {
  const checkedAt = new Date();
  const existingSettings = await getWorkspaceSettings(params.workspaceId);
  const currentSettings =
    (existingSettings?.settings as {
      domain?: Record<string, unknown>;
    } | null) ?? {};
  const currentDomainSettings = currentSettings.domain ?? {};

  await replaceWorkspaceDomainDnsRecords({
    workspaceDomainId: params.workspaceDomainId,
    records: params.managedState.dnsRecords,
    checkedAt,
  });

  const updatedDomain = await updateWorkspaceDomain(params.workspaceDomainId, {
    routingMode: params.managedState.routingMode,
    status: params.managedState.status,
    target: params.managedState.target,
    isVerified: params.managedState.verified,
    verifiedAt: params.managedState.verified ? checkedAt : null,
    lastCheckedAt: checkedAt,
    lastVerificationError: params.managedState.lastVerificationError,
  });

  await updateWorkspaceConfig(params.workspaceId, {
    ...currentSettings,
    domain: resolveManagedDomainSettings({
      currentDomainSettings,
      domain: params.domain,
      isPrimary: params.isPrimary,
      verified: params.managedState.verified,
      redirectTarget: params.managedState.redirectTarget,
      redirectStatusCode: params.managedState.redirectStatusCode ?? null,
      fallbackPrimaryHost:
        params.workspace.defaultDomain ?? params.domain,
    }),
  });

  if (!params.managedState.redirectTarget && params.managedState.verified) {
    if (params.isPrimary) {
      await updateWorkspace(params.workspaceId, {
        defaultDomain: params.domain,
      });
    }
  }

  return {
    domain: updatedDomain,
    verified: params.managedState.verified,
    checkedAt: checkedAt.toISOString(),
  };
}

export async function createWorkspaceCustomDomainSetup(params: {
  workspaceId: string;
  domain: string;
  isPrimary?: boolean;
  routingMode?: WorkspaceDomainRoutingMode;
  managedState: ManagedWorkspaceDomainState;
}) {
  const domain = normalizeWorkspaceCustomDomain(params.domain);
  const existing = await findDomain(domain);

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, 'Domain already exists');
  }

  const [existingCustomDomain, workspace] = await Promise.all([
    workspaceDomainQueries.findFirst({
      where: {
        workspaceId: params.workspaceId,
        type: WorkspaceDomainType.CUSTOM,
      },
    }),
    workspaceQueries.findUnique({
      where: {
        id: params.workspaceId,
      },
      select: {
        id: true,
        slug: true,
        isActive: true,
        defaultDomain: true,
      },
    }),
  ]);
  const requestedPrimary = params.isPrimary ?? !existingCustomDomain;
  const isRedirectAlias = Boolean(params.managedState.redirectTarget);

  if (!workspace) {
    throwError(ERR.NOT_FOUND, 'Workspace not found');
  }

  if (!isRedirectAlias && requestedPrimary) {
    const currentPrimaryDomain = await workspaceDomainQueries.findFirst({
      where: {
        workspaceId: params.workspaceId,
        isPrimary: true,
      },
    });

    if (currentPrimaryDomain) {
      await updateWorkspaceDomain(currentPrimaryDomain.id, {
        isPrimary: false,
      });
    }
  }

  const createdDomain = await createWorkspaceDomain({
    workspaceId: params.workspaceId,
    domain,
    type: WorkspaceDomainType.CUSTOM,
    routingMode: params.managedState.routingMode,
    status: params.managedState.status,
    target: params.managedState.target,
    verificationToken: null,
    isPrimary: isRedirectAlias ? false : requestedPrimary,
    isVerified: params.managedState.verified,
  });

  const checkedAt = new Date();
  const dnsRecords = await replaceWorkspaceDomainDnsRecords({
    workspaceDomainId: createdDomain.id,
    records: params.managedState.dnsRecords,
    checkedAt,
  });

  const existingSettings = await getWorkspaceSettings(params.workspaceId);
  const currentSettings =
    (existingSettings?.settings as {
      domain?: Record<string, unknown>;
    } | null) ?? {};
  const currentDomainSettings = currentSettings.domain ?? {};

  await updateWorkspaceConfig(params.workspaceId, {
    ...currentSettings,
    domain: resolveManagedDomainSettings({
      currentDomainSettings,
      domain,
      isPrimary: isRedirectAlias ? false : requestedPrimary,
      verified: params.managedState.verified,
      redirectTarget: params.managedState.redirectTarget,
      redirectStatusCode: params.managedState.redirectStatusCode ?? null,
      fallbackPrimaryHost: workspace.defaultDomain ?? domain,
    }),
  });

  if (!isRedirectAlias && params.managedState.verified) {
    if (requestedPrimary) {
      await updateWorkspace(params.workspaceId, {
        defaultDomain: domain,
      });
    }
  }

  return {
    domain: createdDomain,
    dnsRecords,
  };
}

export async function getWorkspaceCustomDomainVerificationSnapshot(
  workspaceDomainId: string,
): Promise<WorkspaceCustomDomainVerificationSnapshot> {
  if (!workspaceDomainId) {
    throwError(ERR.INVALID_INPUT, 'workspaceDomainId is required');
  }

  const domain = await workspaceDomainQueries.findFirst({
    where: { id: workspaceDomainId },
    include: {
      dnsRecords: true,
      workspace: {
        select: {
          id: true,
          slug: true,
          isActive: true,
          defaultDomain: true,
        },
      },
    },
  });

  if (!domain) {
    throwError(ERR.NOT_FOUND, 'Workspace domain not found');
  }

  if (domain.type !== WorkspaceDomainType.CUSTOM) {
    throwError(
      ERR.INVALID_STATE,
      'DNS verification is only available for custom white-label domains',
    );
  }

  return domain as unknown as WorkspaceCustomDomainVerificationSnapshot;
}

export async function applyWorkspaceCustomDomainVerificationResult(params: {
  workspaceDomainId: string;
  managedState: ManagedWorkspaceDomainState;
}) {
  const domain = await getWorkspaceCustomDomainVerificationSnapshot(
    params.workspaceDomainId,
  );

  return applyManagedDomainStateToWorkspace({
    workspaceId: domain.workspaceId,
    workspaceDomainId: domain.id,
    domain: domain.domain,
    isPrimary: domain.isPrimary,
    managedState: params.managedState,
    workspace: domain.workspace,
  });
}
