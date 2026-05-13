'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/permissions.services';
import {
  createWorkspaceRedirectAliasActionSchema,
  createWorkspaceRedirectAliasSchema,
  type CreateWorkspaceRedirectAliasActionInput,
  type CreateWorkspaceRedirectAliasDomain,
} from '@/modules/workspace/schema';
import {
  findPrimaryWorkspaceCustomDomain,
  findWorkspaceRedirectAlias,
  getWorkspaceDomainEntitlements,
} from '@/modules/workspace/services/domains.services';
import { createWorkspaceCustomDomainWorkflow } from '@/modules/workspace/workflows/create-workspace-custom-domain.workflow';

const createWorkspaceRedirectAliasActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: CreateWorkspaceRedirectAliasActionInput =
      createWorkspaceRedirectAliasActionSchema.parse(raw);
    const input: CreateWorkspaceRedirectAliasDomain =
      createWorkspaceRedirectAliasSchema.parse(parsed);

    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'workspaceDomain.create');

    const { entitlements } =
      await getWorkspaceDomainEntitlements(session.workspaceId);
    const customDomainSlots = entitlements.limits.max_custom_domains ?? 0;
    const hasCustomDomainFeature =
      entitlements.features.includes('domain_custom') || customDomainSlots > 0;

    if (!hasCustomDomainFeature) {
      throwError(
        ERR.FORBIDDEN,
        'White-label custom domains are not enabled on this workspace plan',
      );
    }

    const primaryRouteDomain = await findPrimaryWorkspaceCustomDomain(
      session.workspaceId,
    );

    if (!primaryRouteDomain) {
      throwError(
        ERR.INVALID_STATE,
        'Add a primary custom domain before creating a redirect alias',
      );
    }

    const existingRedirectAlias = await findWorkspaceRedirectAlias(
      session.workspaceId,
    );

    if (existingRedirectAlias) {
      throwError(
        ERR.INVALID_STATE,
        'A redirect alias is already configured for this workspace',
      );
    }

    const result = await createWorkspaceCustomDomainWorkflow({
      workspaceId: session.workspaceId,
      domain: input.domain,
      isPrimary: false,
      routingMode: input.routingMode,
      redirect: {
        destination: primaryRouteDomain.domain,
        statusCode: 308,
      },
    });

    return {
      successMessage:
        'Redirect alias added. Publish the DNS records below and then run verification.',
      domain: {
        id: result.domain.id,
        domain: result.domain.domain,
        routingMode: result.domain.routingMode,
        status: result.domain.status,
        isPrimary: result.domain.isPrimary,
        redirectTo: primaryRouteDomain.domain,
        redirectStatusCode: 308,
      },
      dnsRecords: result.dnsRecords.map((record) => ({
        id: record.id,
        type: record.type,
        purpose: record.purpose,
        host: record.host,
        expectedValue: record.expectedValue,
        isRequired: record.isRequired,
      })),
    };
  },
);

export async function createWorkspaceRedirectAliasAction(formData: FormData) {
  return createWorkspaceRedirectAliasActionImpl(formData);
}
