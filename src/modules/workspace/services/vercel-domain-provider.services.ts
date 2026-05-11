import {
  DnsRecordType,
  DomainVerificationPurpose,
  WorkspaceDomainRoutingMode,
  WorkspaceDomainStatus,
} from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import type {
  ManagedWorkspaceDnsRecord,
  ManagedWorkspaceRedirectConfig,
  ManagedWorkspaceDomainState,
  ManagedWorkspaceRedirectStatusCode,
} from '@/modules/workspace/services/domain-provider.types';

type VercelDomainVerification = {
  type?: string | null;
  domain?: string | null;
  value?: string | null;
  reason?: string | null;
};

type VercelProjectDomain = {
  name: string;
  verified?: boolean;
  verification?: VercelDomainVerification[];
  redirect?: string | null;
  redirectStatusCode?: number | null;
};

type VercelConfigRecord<TValue> = {
  rank?: number;
  value: TValue;
};

type VercelDomainConfig = {
  configuredBy?: 'CNAME' | 'A' | 'http' | 'dns-01' | null;
  acceptedChallenges?: string[];
  recommendedIPv4?: Array<VercelConfigRecord<string[]>>;
  recommendedCNAME?: Array<VercelConfigRecord<string>>;
  misconfigured?: boolean;
};

class VercelApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(params: {
    message: string;
    status: number;
    code?: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'VercelApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

function getVercelProviderConfig() {
  const accessToken = process.env.VERCEL_ACCESS_TOKEN?.trim();
  const projectIdOrName =
    process.env.VERCEL_PROJECT_ID_OR_NAME?.trim() ||
    process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim();

  const missing = [
    !accessToken ? 'VERCEL_ACCESS_TOKEN' : null,
    !projectIdOrName
      ? 'VERCEL_PROJECT_ID_OR_NAME (or VERCEL_PROJECT_ID)'
      : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throwError(
      ERR.INVALID_STATE,
      `Missing Vercel domain configuration: ${missing.join(', ')}`,
    );
  }

  return {
    accessToken: accessToken!,
    projectIdOrName: projectIdOrName!,
    teamId: teamId || undefined,
    teamSlug: teamSlug || undefined,
  };
}

function buildVercelUrl(
  path: string,
  query?: Record<string, string | undefined | null>,
) {
  const { teamId, teamSlug } = getVercelProviderConfig();
  const url = new URL(`https://api.vercel.com${path}`);

  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }

  if (teamSlug) {
    url.searchParams.set('slug', teamSlug);
  }

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

function getVercelErrorMessage(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    body.error &&
    typeof body.error === 'object'
  ) {
    const errorBody = body.error as {
      code?: string;
      message?: string;
    };

    return errorBody.message || fallback;
  }

  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  return fallback;
}

async function vercelRequest<T>(params: {
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined | null>;
}) {
  const { accessToken } = getVercelProviderConfig();
  const response = await fetch(buildVercelUrl(params.path, params.query), {
    method: params.method ?? 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = getVercelErrorMessage(
      payload,
      `Vercel API request failed (${response.status})`,
    );

    throw new VercelApiError({
      message,
      status: response.status,
      code:
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        payload.error &&
        typeof payload.error === 'object' &&
        'code' in payload.error &&
        typeof payload.error.code === 'string'
          ? payload.error.code
          : undefined,
      details: payload,
    });
  }

  return payload as T;
}

function isExistingDomainError(error: unknown) {
  return (
    error instanceof VercelApiError &&
    error.status === 400 &&
    /already exists|already assigned|already in use/i.test(error.message)
  );
}

function normalizeDnsHost(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/\.$/, '');
}

function pickPreferredCname(config: VercelDomainConfig) {
  const entries = [...(config.recommendedCNAME ?? [])].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  );

  return entries[0]?.value?.trim().toLowerCase() ?? null;
}

function pickPreferredIpv4(config: VercelDomainConfig) {
  const entries = [...(config.recommendedIPv4 ?? [])].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  );
  const preferred = entries[0]?.value ?? [];

  return preferred.map((value) => value.trim()).filter(Boolean);
}

function mapVerificationType(type?: string | null) {
  const upperType = (type ?? '').toUpperCase();

  if (upperType === 'TXT') {
    return DnsRecordType.TXT;
  }

  if (upperType === 'CNAME') {
    return DnsRecordType.CNAME;
  }

  if (upperType === 'A') {
    return DnsRecordType.A;
  }

  return null;
}

function buildOwnershipRecords(params: {
  projectDomain: VercelProjectDomain;
}): ManagedWorkspaceDnsRecord[] {
  const verificationRecords = params.projectDomain.verification ?? [];
  const isVerified = Boolean(params.projectDomain.verified);

  return verificationRecords.reduce<ManagedWorkspaceDnsRecord[]>((records, item) => {
      const type = mapVerificationType(item.type);
      const host = normalizeDnsHost(item.domain);
      const expectedValue = item.value?.trim() ?? '';

      if (!type || !host || !expectedValue) {
        return records;
      }

      records.push({
        type,
        purpose: DomainVerificationPurpose.OWNERSHIP,
        host,
        expectedValue,
        isRequired: true,
        matched: isVerified,
        matchedValue: isVerified ? expectedValue : null,
        lastError: isVerified
          ? null
          : item.reason || 'Ownership verification is still pending in Vercel',
      } satisfies ManagedWorkspaceDnsRecord);

      return records;
    }, []);
}

function buildRoutingRecords(params: {
  domain: string;
  routingMode: WorkspaceDomainRoutingMode;
  config: VercelDomainConfig;
  verified: boolean;
}): ManagedWorkspaceDnsRecord[] {
  const configuredBy = params.config.configuredBy ?? null;
  const routingMatched =
    params.verified ||
    (!params.config.misconfigured &&
      (params.routingMode === WorkspaceDomainRoutingMode.CNAME
        ? configuredBy === 'CNAME' || configuredBy === 'http'
        : configuredBy === 'A' || configuredBy === 'http'));

  if (params.routingMode === WorkspaceDomainRoutingMode.CNAME) {
    const target = pickPreferredCname(params.config);

    if (!target) {
      return [];
    }

    return [
      {
        type: DnsRecordType.CNAME,
        purpose: DomainVerificationPurpose.ROUTING,
        host: params.domain,
        expectedValue: target,
        isRequired: true,
        matched: routingMatched,
        matchedValue: routingMatched ? target : null,
        lastError: routingMatched
          ? null
          : 'Vercel still reports the domain routing as misconfigured',
      },
    ];
  }

  const ipv4Targets = pickPreferredIpv4(params.config);

  return ipv4Targets.map((value) => ({
    type: DnsRecordType.A,
    purpose: DomainVerificationPurpose.ROUTING,
    host: params.domain,
    expectedValue: value,
    isRequired: true,
    matched: routingMatched,
    matchedValue: routingMatched ? value : null,
    lastError: routingMatched
      ? null
      : 'Vercel still reports the apex routing as misconfigured',
  }));
}

function buildDomainState(params: {
  domain: string;
  routingMode: WorkspaceDomainRoutingMode;
  projectDomain: VercelProjectDomain;
  config: VercelDomainConfig;
  verifyError?: string | null;
}): ManagedWorkspaceDomainState {
  const routingRecords = buildRoutingRecords({
    domain: params.domain,
    routingMode: params.routingMode,
    config: params.config,
    verified: Boolean(params.projectDomain.verified),
  });
  const ownershipRecords = buildOwnershipRecords({
    projectDomain: params.projectDomain,
  });
  const dnsRecords = [...ownershipRecords, ...routingRecords];
  const target =
    params.routingMode === WorkspaceDomainRoutingMode.CNAME
      ? pickPreferredCname(params.config)
      : pickPreferredIpv4(params.config)[0] ?? null;
  const verified =
    Boolean(params.projectDomain.verified) && !Boolean(params.config.misconfigured);

  let lastVerificationError: string | null = null;

  if (!verified) {
    if (params.verifyError) {
      lastVerificationError = params.verifyError;
    } else if (!params.projectDomain.verified && ownershipRecords.length > 0) {
      lastVerificationError =
        'Add the Vercel ownership verification record and then retry verification.';
    } else if (params.config.misconfigured) {
      lastVerificationError =
        'Vercel still reports the domain routing as misconfigured. Add the recommended DNS records and retry.';
    } else {
      lastVerificationError =
        'Vercel has not completed verification for this domain yet.';
    }
  }

  return {
    provider: 'vercel',
    domain: params.domain,
    routingMode: params.routingMode,
    target,
    redirectTarget: params.projectDomain.redirect?.trim().toLowerCase() ?? null,
    redirectStatusCode:
      (params.projectDomain.redirectStatusCode as ManagedWorkspaceRedirectStatusCode | null | undefined) ??
      null,
    verified,
    status: verified
      ? WorkspaceDomainStatus.VERIFIED
      : WorkspaceDomainStatus.PENDING_VERIFICATION,
    lastVerificationError,
    dnsRecords,
  };
}

async function addProjectDomain(params: {
  domain: string;
  redirect?: string | null;
  redirectStatusCode?: ManagedWorkspaceRedirectStatusCode | null;
}) {
  const { projectIdOrName } = getVercelProviderConfig();

  return vercelRequest<VercelProjectDomain>({
    path: `/v10/projects/${encodeURIComponent(projectIdOrName)}/domains`,
    method: 'POST',
    body: {
      name: params.domain,
      redirect: params.redirect ?? null,
      redirectStatusCode: params.redirectStatusCode ?? null,
    },
  });
}

async function updateProjectDomain(params: {
  domain: string;
  redirect?: string | null;
  redirectStatusCode?: ManagedWorkspaceRedirectStatusCode | null;
}) {
  const { projectIdOrName } = getVercelProviderConfig();

  return vercelRequest<VercelProjectDomain>({
    path: `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(params.domain)}`,
    method: 'PATCH',
    body: {
      redirect: params.redirect ?? null,
      redirectStatusCode: params.redirectStatusCode ?? null,
    },
  });
}

async function getProjectDomain(domain: string) {
  const { projectIdOrName } = getVercelProviderConfig();

  return vercelRequest<VercelProjectDomain>({
    path: `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(domain)}`,
  });
}

async function getDomainConfig(domain: string) {
  const { projectIdOrName } = getVercelProviderConfig();

  return vercelRequest<VercelDomainConfig>({
    path: `/v6/domains/${encodeURIComponent(domain)}/config`,
    query: {
      projectIdOrName,
    },
  });
}

async function verifyProjectDomain(domain: string) {
  const { projectIdOrName } = getVercelProviderConfig();

  return vercelRequest<VercelProjectDomain>({
    path: `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(domain)}/verify`,
    method: 'POST',
  });
}

export async function provisionCustomDomainViaVercel(params: {
  domain: string;
  routingMode: WorkspaceDomainRoutingMode;
  redirect?: ManagedWorkspaceRedirectConfig;
}): Promise<ManagedWorkspaceDomainState> {
  try {
    try {
      await addProjectDomain({
        domain: params.domain,
        redirect: params.redirect?.destination ?? null,
        redirectStatusCode: params.redirect?.statusCode ?? null,
      });
    } catch (error) {
      if (!isExistingDomainError(error)) {
        throw error;
      }

      if (params.redirect) {
        await updateProjectDomain({
          domain: params.domain,
          redirect: params.redirect.destination,
          redirectStatusCode: params.redirect.statusCode,
        });
      }
    }

    const [projectDomain, config] = await Promise.all([
      getProjectDomain(params.domain),
      getDomainConfig(params.domain),
    ]);

    return buildDomainState({
      domain: params.domain,
      routingMode: params.routingMode,
      projectDomain,
      config,
    });
  } catch (error) {
    if (error instanceof VercelApiError) {
      throwError(ERR.EXTERNAL_SERVICE_ERROR, error.message, undefined, error.details ?? error);
    }

    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to provision custom domain in Vercel',
      undefined,
      error,
    );
  }
}

export async function syncCustomDomainViaVercel(params: {
  domain: string;
  routingMode: WorkspaceDomainRoutingMode;
}): Promise<ManagedWorkspaceDomainState> {
  let verifyError: string | null = null;

  try {
    const currentDomain = await getProjectDomain(params.domain);

    if (!currentDomain.verified) {
      try {
        await verifyProjectDomain(params.domain);
      } catch (error) {
        if (error instanceof VercelApiError) {
          verifyError = error.message;
        } else if (error instanceof Error) {
          verifyError = error.message;
        }
      }
    }

    const [projectDomain, config] = await Promise.all([
      getProjectDomain(params.domain),
      getDomainConfig(params.domain),
    ]);

    return buildDomainState({
      domain: params.domain,
      routingMode: params.routingMode,
      projectDomain,
      config,
      verifyError,
    });
  } catch (error) {
    if (error instanceof VercelApiError) {
      throwError(ERR.EXTERNAL_SERVICE_ERROR, error.message, undefined, error.details ?? error);
    }

    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to sync custom domain from Vercel',
      undefined,
      error,
    );
  }
}

export async function removeCustomDomainFromVercel(domain: string) {
  try {
    const { projectIdOrName } = getVercelProviderConfig();

    await vercelRequest({
      path: `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(domain)}`,
      method: 'DELETE',
    });
  } catch (error) {
    if (error instanceof VercelApiError && error.status === 404) {
      return;
    }

    if (error instanceof VercelApiError) {
      throwError(ERR.EXTERNAL_SERVICE_ERROR, error.message, undefined, error.details ?? error);
    }

    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to remove custom domain from Vercel',
      undefined,
      error,
    );
  }
}
