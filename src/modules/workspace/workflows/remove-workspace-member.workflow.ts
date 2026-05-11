import { prisma } from '@/lib/prisma';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { endMembershipSessions } from '@/modules/auth/services/session.services';
import {
  getRoleDefinitionById,
  getRoleDefinitionByKey,
} from '@/modules/roles/role.services';
import { membershipQueries } from '@/modules/workspace/db';
import { deactivateMembership } from '@/modules/workspace/services/membership.services';

export async function removeWorkspaceMemberWorkflow(input: {
  membershipId: string;
  currentMembershipId?: string;
  currentWorkspaceRoleDefinitionId?: string;
  currentWorkspaceRoleKey?: string;
}) {
  return withUnitOfWork(async () => {
    const membership = await prisma.membership.findUnique({
      where: { id: input.membershipId },
      select: {
        id: true,
        workspaceId: true,
        identityId: true,
        isActive: true,
        roleKey: true,
        roleSystemKey: true,
        roleDefinition: {
          select: {
            id: true,
            name: true,
            hierarchyRank: true,
          },
        },
      },
    });

    if (!membership) {
      throwError(ERR.NOT_FOUND, 'Membership not found.');
    }

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
      const activeOwnerCount = await membershipQueries.count({
        workspaceId: membership.workspaceId,
        roleSystemKey: 'WORKSPACE_OWNER',
        isActive: true,
      });

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
