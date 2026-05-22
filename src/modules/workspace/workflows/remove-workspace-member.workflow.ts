import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { endMembershipSessions } from '@/modules/auth/services/session.services';
import {
  getRoleDefinitionById,
  getRoleDefinitionByKey,
} from '@/modules/roles/services/role.services';
import {
  countActiveWorkspaceOwners,
  deactivateMembership,
  getMembershipWorkspaceSnapshot,
} from '@/modules/workspace/services/membership.services';

export async function removeWorkspaceMemberWorkflow(input: {
  membershipId: string;
  currentMembershipId?: string;
  currentWorkspaceRoleDefinitionId?: string;
  currentWorkspaceRoleKey?: string;
}) {
  return withUnitOfWork(async () => {
    const membership = await getMembershipWorkspaceSnapshot(input.membershipId);

    if (!membership.isActive) {
      throwError(ERR.INVALID_STATE, 'This member has already been removed.');
    }

    if (
      input.currentMembershipId &&
      membership.id === input.currentMembershipId
    ) {
      throwError(
        ERR.FORBIDDEN,
        'You cannot remove the membership that is currently signed in.',
      );
    }

    let currentRoleRank: number | null = null;

    if (input.currentWorkspaceRoleDefinitionId) {
      const currentRoleDefinition = await getRoleDefinitionById(
        input.currentWorkspaceRoleDefinitionId,
      );
      currentRoleRank = currentRoleDefinition.hierarchyRank ?? null;
    } else if (input.currentWorkspaceRoleKey) {
      const currentRoleDefinition = await getRoleDefinitionByKey(
        'WORKSPACE',
        input.currentWorkspaceRoleKey,
      );
      currentRoleRank = currentRoleDefinition?.hierarchyRank ?? null;
    }

    const targetRoleRank = membership.roleDefinition.hierarchyRank ?? null;

    if (
      currentRoleRank !== null &&
      targetRoleRank !== null &&
      targetRoleRank > currentRoleRank
    ) {
      throwError(
        ERR.FORBIDDEN,
        'You cannot remove a member with a higher workspace role.',
      );
    }

    if (membership.roleSystemKey === 'WORKSPACE_OWNER') {
      const activeOwnerCount = await countActiveWorkspaceOwners(
        membership.workspaceId,
      );

      if (activeOwnerCount <= 1) {
        throwError(
          ERR.INVALID_STATE,
          'Add another active owner before removing this one.',
        );
      }
    }

    const updated = await deactivateMembership(membership.id);
    await endMembershipSessions(membership.id);

    return {
      membershipId: updated.id,
      workspaceId: updated.workspaceId,
      identityId: updated.identityId,
      successMessage: 'Workspace member removed successfully.',
    };
  });
}
