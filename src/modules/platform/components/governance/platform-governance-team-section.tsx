'use client';

import { useEffect, useState } from 'react';
import { PlatformGovernanceInvitePanel } from '@/modules/platform/components/governance/platform-governance-invite-panel';
import { PlatformGovernanceInvitesTable } from '@/modules/platform/components/governance/platform-governance-invites-table';
import { PlatformGovernanceMembershipsTable } from '@/modules/platform/components/governance/platform-governance-memberships-table';
import type {
  PlatformGovernanceAssignableRole,
  PlatformGovernanceInviteRow,
  PlatformGovernanceMembershipRow,
} from '@/modules/platform/server/platform-governance-team-page-data';

export function PlatformGovernanceTeamSection({
  assignableRoles,
  initialInvites,
  initialMemberships,
  canManageAssignments,
}: {
  assignableRoles: PlatformGovernanceAssignableRole[];
  initialInvites: PlatformGovernanceInviteRow[];
  initialMemberships: PlatformGovernanceMembershipRow[];
  canManageAssignments: boolean;
}) {
  const [inviteRows, setInviteRows] = useState(initialInvites);
  const [membershipRows, setMembershipRows] = useState(initialMemberships);

  useEffect(() => {
    setInviteRows(initialInvites);
  }, [initialInvites]);

  useEffect(() => {
    setMembershipRows(initialMemberships);
  }, [initialMemberships]);

  return (
    <>
      {canManageAssignments ? (
        <PlatformGovernanceInvitePanel
          assignableRoles={assignableRoles}
          invites={inviteRows}
          onInviteCreated={(invite) => {
            setInviteRows((current) => {
              const next = current.filter((row) => row.id !== invite.id);
              return [invite, ...next];
            });
          }}
        />
      ) : null}

      <PlatformGovernanceMembershipsTable
        rows={membershipRows}
        includeSectionActions={false}
        assignableRoles={assignableRoles}
        canManageRoles={canManageAssignments}
        onMembershipRoleChanged={(membershipId, nextRole) => {
          setMembershipRows((current) =>
            current.map((row) =>
              row.id === membershipId
                ? {
                    ...row,
                    roleName: nextRole.roleName,
                    roleKey: nextRole.roleKey,
                    roleSystemKey: nextRole.roleSystemKey,
                  }
                : row,
            ),
          );
        }}
      />

      <PlatformGovernanceInvitesTable
        rows={inviteRows}
        assignableRoles={assignableRoles}
        canManageRoles={canManageAssignments}
        onInviteRoleChanged={(inviteId, nextRole) => {
          setInviteRows((current) =>
            current.map((row) =>
              row.id === inviteId
                ? {
                    ...row,
                    roleName: nextRole.roleName,
                    roleKey: nextRole.roleKey,
                    roleSystemKey: nextRole.roleSystemKey,
                  }
                : row,
            ),
          );
        }}
        onInviteRevoked={(inviteId) => {
          setInviteRows((current) =>
            current.map((row) =>
              row.id === inviteId
                ? {
                    ...row,
                    isPending: false,
                    statusLabel: 'Revoked',
                  }
                : row,
            ),
          );
        }}
      />
    </>
  );
}
