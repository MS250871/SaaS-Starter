import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { findMembership } from '@/modules/workspace/services/membership.services';
import { getWorkspaceById } from '@/modules/workspace/services/workspace.services';

export type SelectWorkspaceForLoginWorkflowInput = {
  identityId: string;
  workspaceId: string;
};

export type SelectWorkspaceForLoginWorkflowResult = {
  membershipId: string;
  workspaceId: string;
  workspaceName: string;
  roleKey: string;
  roleSystemKey?: string | null;
};

export async function selectWorkspaceForLoginWorkflow(
  input: SelectWorkspaceForLoginWorkflowInput,
): Promise<SelectWorkspaceForLoginWorkflowResult> {
  return withUnitOfWork(async () => {
    const membership = await findMembership(input.workspaceId, input.identityId);

    if (!membership?.isActive) {
      throwError(ERR.UNAUTHORIZED, 'You do not have access to this workspace');
    }

    const workspace = await getWorkspaceById(input.workspaceId);

    if (!workspace.isActive) {
      throwError(ERR.INVALID_STATE, 'Workspace is not active');
    }

    return {
      membershipId: membership.id,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      roleKey: membership.roleKey,
      roleSystemKey: membership.roleSystemKey ?? null,
    };
  });
}
