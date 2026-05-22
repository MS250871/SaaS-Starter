import { InviteStatus } from '@/generated/prisma/client';
import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformInviteAdminSnapshots } from '@/modules/platform/services/invite.services';
import { listPlatformMembershipAdminSnapshots } from '@/modules/platform/services/membership.services';
import { listAssignableRoleDefinitions } from '@/modules/roles/services/role.services';

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

function formatIdentityName(params: {
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

export type PlatformGovernanceMembershipRow = {
  id: string;
  identityId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  identityIsActive: boolean;
  roleName: string;
  roleKey: string;
  roleSystemKey: string | null;
  scopeLabel: string;
  isActive: boolean;
  isSystemRole: boolean;
  isDefaultRole: boolean;
  createdAtLabel: string;
};

export type PlatformGovernanceInviteRow = {
  id: string;
  email: string;
  roleName: string;
  roleKey: string;
  roleSystemKey: string | null;
  scopeLabel: string;
  statusLabel: string;
  isPending: boolean;
  invitedByName: string;
  signupPath: string;
  expiresAtLabel: string;
  createdAtLabel: string;
};

export type PlatformGovernanceAssignableRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  roleSystemKey: string | null;
  isDefault: boolean;
};

export async function getPlatformGovernanceTeamPageData() {
  return withActionTxContext(async () => {
    const [memberships, invites, assignableRoles] = await Promise.all([
      listPlatformMembershipAdminSnapshots({ limit: 500 }),
      listPlatformInviteAdminSnapshots({ limit: 500 }),
      listAssignableRoleDefinitions('PLATFORM'),
    ]);

    const membershipRows: PlatformGovernanceMembershipRow[] = memberships.map(
      (membership) => ({
        id: membership.id,
        identityId: membership.identity.id,
        displayName: formatIdentityName(membership.identity),
        email: membership.identity.email ?? null,
        phone: membership.identity.phone ?? null,
        identityIsActive: membership.identity.isActive,
        roleName: membership.roleDefinition.name,
        roleKey: membership.roleKey,
        roleSystemKey: membership.roleSystemKey ?? null,
        scopeLabel: formatEnumLabel(membership.roleDefinition.scope),
        isActive: membership.isActive,
        isSystemRole: membership.roleDefinition.isSystem,
        isDefaultRole: membership.roleDefinition.isDefault,
        createdAtLabel: formatShortDate(membership.createdAt),
      }),
    );

    const inviteRows: PlatformGovernanceInviteRow[] = invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      roleName: invite.roleDefinition.name,
      roleKey: invite.roleKey,
      roleSystemKey: invite.roleSystemKey ?? null,
      scopeLabel: formatEnumLabel(invite.roleDefinition.scope),
      statusLabel: formatEnumLabel(invite.status),
      isPending: invite.status === InviteStatus.PENDING,
      invitedByName: formatIdentityName(invite.invitedBy ?? {}),
      signupPath: `/signup?entry=platform&invite=${invite.token}`,
      expiresAtLabel: formatDate(invite.expiresAt),
      createdAtLabel: formatShortDate(invite.createdAt),
    }));

    return {
      summary: {
        memberships: membershipRows.length,
        activeMemberships: membershipRows.filter((row) => row.isActive).length,
        inactiveMemberships: membershipRows.filter((row) => !row.isActive).length,
        invites: inviteRows.length,
        pendingInvites: inviteRows.filter((row) => row.isPending).length,
      },
      membershipRows,
      inviteRows,
      assignableRoles: assignableRoles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description ?? null,
        roleSystemKey: (role.systemKey as string | null | undefined) ?? null,
        isDefault: role.isDefault,
      })),
    };
  });
}
