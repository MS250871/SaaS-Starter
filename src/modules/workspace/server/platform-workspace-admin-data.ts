import { WorkspaceDomainType } from '@/generated/prisma/client';
import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  listPlatformWorkspaceActiveSubscriptionAdminSnapshots,
} from '@/modules/billing/services/subscription.services';
import {
  listPlatformWorkspaceDomainAdminSnapshots,
  listWorkspaceDomainsDetailed,
} from '@/modules/workspace/services/domains.services';
import {
  listPlatformWorkspaceInviteAdminSnapshots,
  listPendingWorkspaceInvitesWithRoles,
} from '@/modules/workspace/services/invite.services';
import {
  listActiveWorkspaceMembersWithRoles,
  listPlatformWorkspaceMembershipAdminSnapshots,
} from '@/modules/workspace/services/membership.services';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import {
  getPlatformWorkspaceAdminSnapshot,
  listPlatformWorkspaceAdminSnapshots,
} from '@/modules/workspace/services/workspace.services';
import { normalizeWorkspaceDomainStrategy } from '@/modules/workspace/routing';

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

function formatDomainStrategyLabel(value: string | null | undefined) {
  const strategy = normalizeWorkspaceDomainStrategy(value);

  if (strategy === 'custom_domain') {
    return 'Custom domain';
  }

  if (strategy === 'subdomain') {
    return 'Subdomain';
  }

  return 'Free path';
}

function formatDomainTypeLabel(type: WorkspaceDomainType) {
  if (type === WorkspaceDomainType.CUSTOM) {
    return 'Custom';
  }

  if (type === WorkspaceDomainType.SUBDOMAIN) {
    return 'Subdomain';
  }

  return 'Free path';
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

function formatWorkspaceMemberName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
    params.email ||
    'Workspace member'
  );
}

type WorkspaceSettingsShape = {
  domain?: {
    strategy?: string | null;
    primaryHost?: string | null;
    customDomain?: string | null;
    customDomainVerified?: boolean | null;
  };
};

export type PlatformWorkspaceListRow = {
  id: string;
  name: string;
  slug: string;
  defaultDomain: string | null;
  primaryEmail: string | null;
  isActive: boolean;
  routeStrategy: string;
  routeStrategyLabel: string;
  currentHostLabel: string;
  memberCount: number;
  customerCount: number;
  inviteCount: number;
  apiKeyCount: number;
  domainCount: number;
  activePlanName: string | null;
  activePlanKey: string | null;
  activeSubscriptionStatus: string | null;
  createdAtLabel: string;
};

export type PlatformWorkspaceDomainRow = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceIsActive: boolean;
  domain: string;
  type: WorkspaceDomainType;
  typeLabel: string;
  routingModeLabel: string;
  statusLabel: string;
  isPrimary: boolean;
  isVerified: boolean;
  verificationLabel: string;
  dnsHealthLabel: string;
  lastCheckedAtLabel: string;
  createdAtLabel: string;
};

export type PlatformWorkspaceMembershipRow = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceIsActive: boolean;
  memberName: string;
  memberEmail: string | null;
  roleName: string;
  roleKey: string | null;
  roleSystemKey: string | null;
  isActive: boolean;
  statusLabel: string;
  expiresAtLabel: string;
  createdAtLabel: string;
};

export type PlatformWorkspaceInviteRow = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceIsActive: boolean;
  email: string;
  roleName: string;
  roleKey: string | null;
  roleSystemKey: string | null;
  statusLabel: string;
  invitedByName: string;
  expiresAtLabel: string;
  createdAtLabel: string;
};

export async function getPlatformWorkspacesPageData() {
  return withActionTxContext(async () => {
    const workspaces = await listPlatformWorkspaceAdminSnapshots({
      page: 1,
      pageSize: 250,
    });

    const workspaceIds = workspaces.items.map((workspace) => workspace.id);
    const subscriptions =
      await listPlatformWorkspaceActiveSubscriptionAdminSnapshots(workspaceIds);
    const subscriptionByWorkspaceId = new Map(
      subscriptions
        .filter((subscription) => Boolean(subscription.workspaceId))
        .map((subscription) => [subscription.workspaceId!, subscription]),
    );

    const rows: PlatformWorkspaceListRow[] = workspaces.items.map((workspace) => {
      const settings = (workspace.settings?.settings ??
        null) as WorkspaceSettingsShape | null;
      const strategy = normalizeWorkspaceDomainStrategy(
        settings?.domain?.strategy,
      );
      const subscription = subscriptionByWorkspaceId.get(workspace.id) ?? null;

      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        defaultDomain: workspace.defaultDomain,
        primaryEmail: workspace.primaryEmail,
        isActive: workspace.isActive,
        routeStrategy: strategy,
        routeStrategyLabel: formatDomainStrategyLabel(strategy),
        currentHostLabel:
          strategy === 'free_path'
            ? `/${workspace.slug}`
            : settings?.domain?.primaryHost ??
              settings?.domain?.customDomain ??
              workspace.defaultDomain ??
              'N/A',
        memberCount: workspace._count.memberships,
        customerCount: workspace._count.customers,
        inviteCount: workspace._count.invites,
        apiKeyCount: workspace._count.apiKeys,
        domainCount: workspace._count.domains,
        activePlanName: subscription?.price.product.plan?.name ?? null,
        activePlanKey: subscription?.price.product.plan?.key ?? null,
        activeSubscriptionStatus: subscription?.status ?? null,
        createdAtLabel: formatShortDate(workspace.createdAt),
      };
    });

    return {
      summary: {
        total: rows.length,
        active: rows.filter((row) => row.isActive).length,
        freePath: rows.filter((row) => row.routeStrategy === 'free_path').length,
        subdomain: rows.filter((row) => row.routeStrategy === 'subdomain').length,
        customDomain: rows.filter((row) => row.routeStrategy === 'custom_domain').length,
        paid: rows.filter((row) => row.activePlanKey !== null).length,
      },
      rows,
    };
  });
}

export async function getPlatformWorkspaceDomainsPageData() {
  return withActionTxContext(async () => {
    const domains = await listPlatformWorkspaceDomainAdminSnapshots({
      limit: 500,
    });

    const rows: PlatformWorkspaceDomainRow[] = domains.map((domain) => {
      const requiredRecordCount = domain.dnsRecords.filter(
        (record) => record.isRequired,
      ).length;
      const matchedRequiredRecordCount = domain.dnsRecords.filter(
        (record) => record.isRequired && record.isMatched,
      ).length;

      return {
        id: domain.id,
        workspaceId: domain.workspace.id,
        workspaceName: domain.workspace.name,
        workspaceSlug: domain.workspace.slug,
        workspaceIsActive: domain.workspace.isActive,
        domain: domain.domain,
        type: domain.type,
        typeLabel: formatDomainTypeLabel(domain.type),
        routingModeLabel: formatEnumLabel(domain.routingMode),
        statusLabel: formatEnumLabel(domain.status),
        isPrimary: domain.isPrimary,
        isVerified: domain.isVerified,
        verificationLabel: domain.isVerified ? 'Verified' : 'Pending',
        dnsHealthLabel:
          requiredRecordCount > 0
            ? `${matchedRequiredRecordCount}/${requiredRecordCount} matched`
            : 'No checks required',
        lastCheckedAtLabel: formatDate(domain.lastCheckedAt),
        createdAtLabel: formatShortDate(domain.createdAt),
      };
    });

    return {
      summary: {
        total: rows.length,
        verified: rows.filter((row) => row.isVerified).length,
        primary: rows.filter((row) => row.isPrimary).length,
        custom: rows.filter((row) => row.typeLabel === 'Custom').length,
      },
      rows,
    };
  });
}

export async function getPlatformWorkspaceAccessPageData() {
  return withActionTxContext(async () => {
    const [memberships, invites] = await Promise.all([
      listPlatformWorkspaceMembershipAdminSnapshots({ limit: 500 }),
      listPlatformWorkspaceInviteAdminSnapshots({ limit: 500 }),
    ]);

    const membershipRows: PlatformWorkspaceMembershipRow[] = memberships.map(
      (membership) => ({
        id: membership.id,
        workspaceId: membership.workspace.id,
        workspaceName: membership.workspace.name,
        workspaceSlug: membership.workspace.slug,
        workspaceIsActive: membership.workspace.isActive,
        memberName: formatWorkspaceMemberName({
          firstName: membership.identity.firstName,
          lastName: membership.identity.lastName,
          email: membership.identity.email,
        }),
        memberEmail: membership.identity.email ?? null,
        roleName: membership.roleDefinition.name,
        roleKey: membership.roleKey,
        roleSystemKey: membership.roleSystemKey,
        isActive: membership.isActive,
        statusLabel: membership.isActive ? 'Active' : 'Inactive',
        expiresAtLabel: formatDate(membership.expiresAt),
        createdAtLabel: formatShortDate(membership.createdAt),
      }),
    );

    const inviteRows: PlatformWorkspaceInviteRow[] = invites.map((invite) => ({
      id: invite.id,
      workspaceId: invite.workspace.id,
      workspaceName: invite.workspace.name,
      workspaceSlug: invite.workspace.slug,
      workspaceIsActive: invite.workspace.isActive,
      email: invite.email,
      roleName: invite.roleDefinition.name,
      roleKey: invite.roleKey,
      roleSystemKey: invite.roleSystemKey,
      statusLabel: formatEnumLabel(invite.status),
      invitedByName: formatWorkspaceMemberName({
        firstName: invite.invitedBy?.firstName,
        lastName: invite.invitedBy?.lastName,
        email: invite.invitedBy?.email,
      }),
      expiresAtLabel: formatDate(invite.expiresAt),
      createdAtLabel: formatShortDate(invite.createdAt),
    }));

    return {
      summary: {
        memberships: membershipRows.length,
        activeMemberships: membershipRows.filter((row) => row.isActive).length,
        invites: inviteRows.length,
        pendingInvites: inviteRows.filter((row) => row.statusLabel === 'Pending')
          .length,
      },
      membershipRows,
      inviteRows,
    };
  });
}

export async function getPlatformWorkspaceDetailPageData(workspaceId: string) {
  return withActionTxContext(async () => {
    const workspace = await getPlatformWorkspaceAdminSnapshot(workspaceId);
    const [settings, activeSubscription, domains, members, pendingInvites] =
      await Promise.all([
        getWorkspaceSettings(workspaceId),
        listPlatformWorkspaceActiveSubscriptionAdminSnapshots([workspaceId]).then(
          (rows) => rows[0] ?? null,
        ),
        listWorkspaceDomainsDetailed(workspaceId),
        listActiveWorkspaceMembersWithRoles(workspaceId),
        listPendingWorkspaceInvitesWithRoles(workspaceId, 20),
      ]);

    const settingsJson = (settings?.settings ?? null) as WorkspaceSettingsShape | null;
    const routeStrategy = normalizeWorkspaceDomainStrategy(
      settingsJson?.domain?.strategy,
    );

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        defaultDomain: workspace.defaultDomain,
        primaryEmail: workspace.primaryEmail,
        isActive: workspace.isActive,
        createdAtLabel: formatDate(workspace.createdAt),
        routeStrategyLabel: formatDomainStrategyLabel(routeStrategy),
        currentHostLabel:
          routeStrategy === 'free_path'
            ? `/${workspace.slug}`
            : settingsJson?.domain?.primaryHost ??
              settingsJson?.domain?.customDomain ??
              workspace.defaultDomain ??
              'N/A',
        activePlanName: activeSubscription?.price.product.plan?.name ?? null,
        activePlanKey: activeSubscription?.price.product.plan?.key ?? null,
        activeSubscriptionStatus: activeSubscription?.status ?? null,
        renewalAtLabel: formatDate(activeSubscription?.currentPeriodEnd),
        memberCount: workspace._count.memberships,
        customerCount: workspace._count.customers,
        inviteCount: workspace._count.invites,
        domainCount: workspace._count.domains,
        apiKeyCount: workspace._count.apiKeys,
      },
      domains: domains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        typeLabel: formatDomainTypeLabel(domain.type),
        statusLabel: formatEnumLabel(domain.status),
        isPrimary: domain.isPrimary,
        isVerified: domain.isVerified,
        lastCheckedAtLabel: formatDate(domain.lastCheckedAt),
      })),
      members: members.map((member) => ({
        id: member.id,
        memberName: formatWorkspaceMemberName({
          firstName: member.identity.firstName,
          lastName: member.identity.lastName,
          email: member.identity.email,
        }),
        memberEmail: member.identity.email ?? null,
        roleName: member.roleDefinition.name,
        roleKey: member.roleKey,
        createdAtLabel: formatShortDate(member.createdAt),
      })),
      pendingInvites: pendingInvites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        roleName: invite.roleDefinition.name,
        expiresAtLabel: formatDate(invite.expiresAt),
        createdAtLabel: formatShortDate(invite.createdAt),
      })),
    };
  });
}
