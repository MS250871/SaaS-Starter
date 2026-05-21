import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getPlatformIdentityAdminSnapshot,
  listPlatformIdentityAdminSnapshots,
} from '@/modules/auth/services/identity.services';
import { listPlatformAuthAccountAdminSnapshots } from '@/modules/auth/services/authAccount.services';
import { listPlatformSessionAdminSnapshots } from '@/modules/auth/services/session.services';
import { listPlatformOtpRequestAdminSnapshots } from '@/modules/auth/services/otp.services';

function formatName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return (
    `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
    params.email ||
    params.phone ||
    'Unnamed identity'
  );
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatShortDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(value);
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getSessionContextLabel(params: {
  workspaceName?: string | null;
  workspaceSlug?: string | null;
  customerId?: string | null;
  membershipId?: string | null;
}) {
  if (params.customerId) {
    return params.workspaceName
      ? `Customer / ${params.workspaceName}`
      : 'Customer session';
  }

  if (params.membershipId) {
    return params.workspaceName
      ? `Member / ${params.workspaceName}`
      : 'Workspace member';
  }

  if (params.workspaceSlug) {
    return `Workspace / ${params.workspaceSlug}`;
  }

  return 'Platform';
}

export type PlatformIdentityRow = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  authAccountCount: number;
  sessionCount: number;
  customerCount: number;
  membershipCount: number;
  platformTeamCount: number;
  createdAtLabel: string;
};

export type PlatformAuthAccountRow = {
  id: string;
  identityId: string;
  displayName: string;
  identityEmail: string | null;
  typeLabel: string;
  value: string;
  isVerified: boolean;
  verifiedAtLabel: string;
  passwordLabel: string;
  createdAtLabel: string;
};

export type PlatformSessionRow = {
  id: string;
  identityId: string;
  displayName: string;
  identityEmail: string | null;
  contextLabel: string;
  roleLabel: string;
  deviceLabel: string;
  isActive: boolean;
  statusLabel: string;
  expiresAtLabel: string;
  lastSeenAtLabel: string;
  createdAtLabel: string;
};

export type PlatformOtpRequestRow = {
  id: string;
  identityId: string;
  displayName: string;
  accountLabel: string;
  workspaceLabel: string;
  purposeLabel: string;
  attempts: number;
  resendCount: number;
  statusLabel: string;
  expiresAtLabel: string;
  updatedAtLabel: string;
};

export async function getPlatformIdentitiesPageData() {
  return withActionTxContext(async () => {
    const identities = await listPlatformIdentityAdminSnapshots({ limit: 500 });

    const rows: PlatformIdentityRow[] = identities.map((identity) => ({
      id: identity.id,
      displayName: formatName(identity),
      email: identity.email ?? null,
      phone: identity.phone ?? null,
      isActive: identity.isActive,
      authAccountCount: identity._count.authAccounts,
      sessionCount: identity._count.sessions,
      customerCount: identity._count.customers,
      membershipCount: identity._count.memberships,
      platformTeamCount: identity._count.platformMemberships,
      createdAtLabel: formatShortDate(identity.createdAt),
    }));

    return {
      summary: {
        total: rows.length,
        active: rows.filter((row) => row.isActive).length,
        customerLinked: rows.filter((row) => row.customerCount > 0).length,
        platformTeam: rows.filter((row) => row.platformTeamCount > 0).length,
      },
      rows,
    };
  });
}

export async function getPlatformIdentityAccountsPageData() {
  return withActionTxContext(async () => {
    const accounts = await listPlatformAuthAccountAdminSnapshots({ limit: 500 });

    const rows: PlatformAuthAccountRow[] = accounts.map((account) => ({
      id: account.id,
      identityId: account.identity.id,
      displayName: formatName(account.identity),
      identityEmail: account.identity.email ?? null,
      typeLabel: formatEnumLabel(account.type),
      value: account.value,
      isVerified: account.isVerified,
      verifiedAtLabel: formatDate(account.verifiedAt),
      passwordLabel: account.passwordHash ? 'Password set' : 'Passwordless',
      createdAtLabel: formatShortDate(account.createdAt),
    }));

    return {
      summary: {
        total: rows.length,
        verified: rows.filter((row) => row.isVerified).length,
        email: rows.filter((row) => row.typeLabel === 'Email').length,
        phone: rows.filter((row) => row.typeLabel === 'Phone').length,
      },
      rows,
    };
  });
}

export async function getPlatformIdentitySessionsPageData() {
  return withActionTxContext(async () => {
    const [sessions, otpRequests] = await Promise.all([
      listPlatformSessionAdminSnapshots({ limit: 500 }),
      listPlatformOtpRequestAdminSnapshots({ limit: 500 }),
    ]);

    const sessionRows: PlatformSessionRow[] = sessions.map((session) => ({
      id: session.id,
      identityId: session.identity.id,
      displayName: formatName(session.identity),
      identityEmail: session.identity.email ?? null,
      contextLabel: getSessionContextLabel({
        workspaceName: session.workspace?.name,
        workspaceSlug: session.workspace?.slug,
        customerId: session.customerId,
        membershipId: session.membershipId,
      }),
      roleLabel:
        session.workspaceRoleSystemKey ??
        session.workspaceRoleKey ??
        (session.workspaceId ? 'Workspace context' : 'Platform'),
      deviceLabel:
        [session.browser, session.os, session.device].filter(Boolean).join(' / ') ||
        'Unknown device',
      isActive: session.isActive,
      statusLabel: session.isActive
        ? 'Active'
        : session.endedReason
          ? `Ended / ${formatEnumLabel(session.endedReason)}`
          : 'Ended',
      expiresAtLabel: formatDate(session.expiresAt),
      lastSeenAtLabel: formatDate(session.lastSeenAt),
      createdAtLabel: formatShortDate(session.createdAt),
    }));

    const now = Date.now();
    const otpRows: PlatformOtpRequestRow[] = otpRequests.map((request) => ({
      id: request.id,
      identityId: request.authAccount.identity.id,
      displayName: formatName(request.authAccount.identity),
      accountLabel: `${formatEnumLabel(request.authAccount.type)} / ${request.authAccount.value}`,
      workspaceLabel: request.workspace
        ? `${request.workspace.name} (${request.workspace.slug})`
        : 'Platform',
      purposeLabel: formatEnumLabel(request.otpPurpose),
      attempts: request.attempts,
      resendCount: request.resendCount,
      statusLabel:
        request.expiresAt.getTime() < now ? 'Expired' : 'Pending verification',
      expiresAtLabel: formatDate(request.expiresAt),
      updatedAtLabel: formatDate(request.updatedAt),
    }));

    return {
      summary: {
        sessions: sessionRows.length,
        activeSessions: sessionRows.filter((row) => row.isActive).length,
        customerSessions: sessionRows.filter((row) =>
          row.contextLabel.startsWith('Customer'),
        ).length,
        workspaceSessions: sessionRows.filter((row) =>
          row.contextLabel.startsWith('Member') ||
          row.contextLabel.startsWith('Workspace'),
        ).length,
        otpRequests: otpRows.length,
      },
      sessionRows,
      otpRows,
    };
  });
}

export async function getPlatformIdentityDetailPageData(identityId: string) {
  return withActionTxContext(async () => {
    const identity = await getPlatformIdentityAdminSnapshot(identityId);
    const [accounts, sessions, otpRequests] = await Promise.all([
      listPlatformAuthAccountAdminSnapshots({ identityId, limit: 100 }),
      listPlatformSessionAdminSnapshots({ identityId, limit: 100 }),
      listPlatformOtpRequestAdminSnapshots({ identityId, limit: 100 }),
    ]);

    return {
      identity: {
        id: identity.id,
        displayName: formatName(identity),
        email: identity.email ?? null,
        phone: identity.phone ?? null,
        isActive: identity.isActive,
        authAccountCount: identity._count.authAccounts,
        sessionCount: identity._count.sessions,
        customerCount: identity._count.customers,
        membershipCount: identity._count.memberships,
        platformTeamCount: identity._count.platformMemberships,
        createdAtLabel: formatDate(identity.createdAt),
        updatedAtLabel: formatDate(identity.updatedAt),
      },
      accounts: accounts.map((account) => ({
        id: account.id,
        typeLabel: formatEnumLabel(account.type),
        value: account.value,
        isVerified: account.isVerified,
        verifiedAtLabel: formatDate(account.verifiedAt),
        passwordLabel: account.passwordHash ? 'Password set' : 'Passwordless',
        createdAtLabel: formatShortDate(account.createdAt),
      })),
      sessions: sessions.map((session) => ({
        id: session.id,
        contextLabel: getSessionContextLabel({
          workspaceName: session.workspace?.name,
          workspaceSlug: session.workspace?.slug,
          customerId: session.customerId,
          membershipId: session.membershipId,
        }),
        statusLabel: session.isActive
          ? 'Active'
          : session.endedReason
            ? `Ended / ${formatEnumLabel(session.endedReason)}`
            : 'Ended',
        deviceLabel:
          [session.browser, session.os, session.device].filter(Boolean).join(' / ') ||
          'Unknown device',
        expiresAtLabel: formatDate(session.expiresAt),
        lastSeenAtLabel: formatDate(session.lastSeenAt),
        createdAtLabel: formatShortDate(session.createdAt),
      })),
      otpRequests: otpRequests.map((request) => ({
        id: request.id,
        accountLabel: `${formatEnumLabel(request.authAccount.type)} / ${request.authAccount.value}`,
        purposeLabel: formatEnumLabel(request.otpPurpose),
        statusLabel:
          request.expiresAt.getTime() < Date.now()
            ? 'Expired'
            : 'Pending verification',
        expiresAtLabel: formatDate(request.expiresAt),
        updatedAtLabel: formatDate(request.updatedAt),
      })),
    };
  });
}
