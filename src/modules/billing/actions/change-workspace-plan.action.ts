'use server';

import { headers } from 'next/headers';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { normalizeHostname } from '@/lib/middleware/proxy-utils';
import {
  buildHostTransferPath,
  issueHostTransferToken,
} from '@/modules/auth/services/host-transfer.services';
import { assertPermission } from '@/modules/permissions/services/permissions.services';
import {
  changeWorkspacePlanActionSchema,
  type ChangeWorkspacePlanActionInput,
} from '@/modules/billing/schema';
import { changeWorkspacePlanWorkflow } from '@/modules/billing/workflows/change-workspace-plan.workflow';

const changeWorkspacePlanActionImpl = createAction(
  async (input: ChangeWorkspacePlanActionInput) => {
    const parsed = changeWorkspacePlanActionSchema.parse(input);
    const session = await getUserSession();

    if (!session?.identityId || !session.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'subscription.cancel');

    const result = await changeWorkspacePlanWorkflow(
      {
        identityId: session.identityId,
        workspaceId: session.workspaceId,
      },
      parsed,
    );

    const currentHost = normalizeHostname((await headers()).get('host') ?? '');

    if (currentHost !== result.canonicalHost) {
      const token = await issueHostTransferToken({
        session,
        workspaceId: result.workspaceId,
        targetHost: result.canonicalHost,
        intent: result.intent,
        returnPath: result.redirectTo,
      });

      return {
        ...result,
        redirectTo: buildHostTransferPath(token),
      };
    }

    return result;
  },
);

export async function changeWorkspacePlanAction(
  input: ChangeWorkspacePlanActionInput,
) {
  return changeWorkspacePlanActionImpl(input);
}
