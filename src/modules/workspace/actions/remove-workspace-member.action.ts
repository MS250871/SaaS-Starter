'use server';

import { z } from 'zod';
import { createAction } from '@/lib/http/create-action';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  assertPermission,
  hasPermission,
} from '@/modules/permissions/services/permissions.services';
import { removeWorkspaceMemberWorkflow } from '@/modules/workspace/workflows/remove-workspace-member.workflow';

const removeWorkspaceMemberSchema = z.object({
  membershipId: z.string().uuid('Invalid membership id'),
});

const removeWorkspaceMemberActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed = removeWorkspaceMemberSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    if (
      !hasPermission(session.permissions, 'membership.delete') &&
      !hasPermission(session.permissions, 'membership.deactivate')
    ) {
      assertPermission(session.permissions, 'membership.delete');
    }

    return removeWorkspaceMemberWorkflow({
      membershipId: parsed.membershipId,
      currentMembershipId: session.membershipId,
      currentWorkspaceRoleDefinitionId: session.workspaceRoleId,
      currentWorkspaceRoleKey: session.workspaceRoleKey ?? session.workspaceRole,
    });
  },
);

export async function removeWorkspaceMemberAction(formData: FormData) {
  return removeWorkspaceMemberActionImpl(formData);
}
