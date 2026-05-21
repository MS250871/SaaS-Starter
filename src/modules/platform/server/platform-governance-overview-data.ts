import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformInviteAdminSnapshots } from '@/modules/platform/services/invite.services';
import { listPlatformMembershipAdminSnapshots } from '@/modules/platform/services/membership.services';
import { listGovernanceRoleAdminSnapshots } from '@/modules/roles/role.services';
import { listGovernancePermissionAdminSnapshots } from '@/modules/permissions/permissions.services';
import { listPlatformAdminAuditSnapshots } from '@/modules/audit/audit.services';

export async function getPlatformGovernanceOverviewData() {
  return withActionTxContext(async () => {
    const [memberships, invites, roles, permissions, auditLogs] = await Promise.all([
      listPlatformMembershipAdminSnapshots({ limit: 500 }),
      listPlatformInviteAdminSnapshots({ limit: 500 }),
      listGovernanceRoleAdminSnapshots({ limit: 500 }),
      listGovernancePermissionAdminSnapshots({ limit: 500 }),
      listPlatformAdminAuditSnapshots({ limit: 500 }),
    ]);

    return {
      totalMemberships: memberships.length,
      activeMemberships: memberships.filter((membership) => membership.isActive).length,
      pendingInvites: invites.filter((invite) => invite.status === 'PENDING').length,
      activeRoles: roles.filter((role) => role.isActive).length,
      activePermissions: permissions.filter((permission) => permission.isActive).length,
      auditEvents: auditLogs.length,
    };
  });
}
