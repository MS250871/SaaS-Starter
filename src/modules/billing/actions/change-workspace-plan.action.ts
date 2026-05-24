'use server';

import { headers } from 'next/headers';
import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { normalizeHostname } from '@/lib/middleware/proxy-utils';
import { resolvePublicHostname } from '@/lib/http/public-url';
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

function buildWorkspaceBillingAuditInput(params: {
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return {
    scope: 'WORKSPACE' as const,
    category: 'BILLING' as const,
    source: 'WORKSPACE_APP' as const,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  };
}

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

    const hdrs = await headers();
    const currentHost = resolvePublicHostname({
      host: hdrs.get('host'),
      forwardedHost: hdrs.get('x-forwarded-host'),
    });

    if (currentHost !== normalizeHostname(result.canonicalHost)) {
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
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const input = args[0];

        return buildWorkspaceBillingAuditInput({
          action: 'workspace.plan.change',
          entityType: 'Workspace',
          entityId: result.workspaceId,
          description: `Workspace plan changed to ${input.targetPlanKey}.`,
          metadata: {
            canonicalHost: result.canonicalHost,
            intent: result.intent,
            source: input.source ?? null,
            targetPlanKey: input.targetPlanKey,
          },
        });
      },
    },
  },
);

export async function changeWorkspacePlanAction(
  input: ChangeWorkspacePlanActionInput,
) {
  return changeWorkspacePlanActionImpl(input);
}
