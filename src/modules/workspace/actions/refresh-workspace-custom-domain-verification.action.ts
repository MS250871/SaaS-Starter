'use server';

import { WorkspaceDomainType } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/permissions.services';
import {
  refreshWorkspaceCustomDomainVerificationActionSchema,
  type RefreshWorkspaceCustomDomainVerificationActionInput,
} from '@/modules/workspace/schema';
import { getWorkspaceDomainById } from '@/modules/workspace/services/domains.services';
import { refreshWorkspaceCustomDomainVerificationWorkflow } from '@/modules/workspace/workflows/refresh-workspace-custom-domain-verification.workflow';

const refreshWorkspaceCustomDomainVerificationActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: RefreshWorkspaceCustomDomainVerificationActionInput =
      refreshWorkspaceCustomDomainVerificationActionSchema.parse(raw);

    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'workspaceDomain.verify');

    const domain = await getWorkspaceDomainById(
      session.workspaceId,
      parsed.workspaceDomainId,
    );

    if (domain.type !== WorkspaceDomainType.CUSTOM) {
      throwError(
        ERR.INVALID_STATE,
        'Verification checks are only available for custom workspace domains',
      );
    }

    const result = await refreshWorkspaceCustomDomainVerificationWorkflow({
      workspaceDomainId: parsed.workspaceDomainId,
    });

    return {
      successMessage: result.verified
        ? `${domain.domain} is now verified and ready for white-label routing.`
        : `DNS verification is still pending for ${domain.domain}. Double-check the expected records and try again.`,
      workspaceDomainId: parsed.workspaceDomainId,
      verified: result.verified,
      checkedAt: result.checkedAt,
    };
  },
);

export async function refreshWorkspaceCustomDomainVerificationAction(
  formData: FormData,
) {
  return refreshWorkspaceCustomDomainVerificationActionImpl(formData);
}
