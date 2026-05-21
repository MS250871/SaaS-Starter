'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { assertPlatformPermission } from '@/modules/platform/platform-admin-access';
import {
  createPlatformWorkspaceCustomDomainActionSchema,
  createPlatformWorkspaceCustomDomainSchema,
  createPlatformWorkspaceRedirectAliasActionSchema,
  createPlatformWorkspaceRedirectAliasSchema,
  platformWorkspaceDomainActionSchema,
  platformWorkspaceRoutingActionSchema,
  type CreatePlatformWorkspaceCustomDomainActionInput,
  type CreatePlatformWorkspaceCustomDomainDomain,
  type CreatePlatformWorkspaceRedirectAliasActionInput,
  type CreatePlatformWorkspaceRedirectAliasDomain,
  type PlatformWorkspaceDomainActionInput,
  type PlatformWorkspaceRoutingActionInput,
} from '@/modules/workspace/schema';
import {
  createPlatformWorkspaceCustomDomainWorkflow,
  createPlatformWorkspaceRedirectAliasWorkflow,
  deletePlatformWorkspaceDomainWorkflow,
  refreshPlatformWorkspaceDomainVerificationWorkflow,
  resyncPlatformWorkspaceRoutingWorkflow,
  setPlatformWorkspacePrimaryDomainWorkflow,
} from '@/modules/workspace/workflows/platform-workspace-domain-admin.workflows';

async function requirePlatformWorkspaceDomainPermission(required: string) {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformPermission({
    roleSystemKeys: session.platformRoleSystemKeys ?? [],
    roleKeys: session.platformRoleKeys ?? [],
    permissions: session.permissions ?? [],
    required,
  });

  return session;
}

const resyncPlatformWorkspaceRoutingActionImpl = createAction(
  async (formData: FormData) => {
    await requirePlatformWorkspaceDomainPermission('workspaceDomain.update');

    const raw = Object.fromEntries(formData.entries());
    const parsed: PlatformWorkspaceRoutingActionInput =
      platformWorkspaceRoutingActionSchema.parse(raw);

    const snapshot = await resyncPlatformWorkspaceRoutingWorkflow({
      workspaceId: parsed.workspaceId,
    });

    return {
      workspaceId: parsed.workspaceId,
      strategy: snapshot.strategy,
      primaryHost: snapshot.primaryHost,
      successMessage: `Routing was resynced. Current primary host is ${snapshot.primaryHost}.`,
    };
  },
);

const createPlatformWorkspaceCustomDomainActionImpl = createAction(
  async (formData: FormData) => {
    await requirePlatformWorkspaceDomainPermission('workspaceDomain.create');

    const raw = Object.fromEntries(formData.entries());
    const parsed: CreatePlatformWorkspaceCustomDomainActionInput =
      createPlatformWorkspaceCustomDomainActionSchema.parse(raw);
    const input: CreatePlatformWorkspaceCustomDomainDomain =
      createPlatformWorkspaceCustomDomainSchema.parse(parsed);

    const result = await createPlatformWorkspaceCustomDomainWorkflow(input);

    return {
      workspaceId: input.workspaceId,
      workspaceDomainId: result.domain.id,
      successMessage:
        'Custom domain added. Publish the DNS records and then refresh verification.',
    };
  },
);

const createPlatformWorkspaceRedirectAliasActionImpl = createAction(
  async (formData: FormData) => {
    await requirePlatformWorkspaceDomainPermission('workspaceDomain.create');

    const raw = Object.fromEntries(formData.entries());
    const parsed: CreatePlatformWorkspaceRedirectAliasActionInput =
      createPlatformWorkspaceRedirectAliasActionSchema.parse(raw);
    const input: CreatePlatformWorkspaceRedirectAliasDomain =
      createPlatformWorkspaceRedirectAliasSchema.parse(parsed);

    const result = await createPlatformWorkspaceRedirectAliasWorkflow(input);

    return {
      workspaceId: input.workspaceId,
      workspaceDomainId: result.domain.id,
      successMessage:
        'Redirect alias added. Publish the DNS records and then refresh verification.',
    };
  },
);

const refreshPlatformWorkspaceDomainVerificationActionImpl = createAction(
  async (formData: FormData) => {
    await requirePlatformWorkspaceDomainPermission('workspaceDomain.verify');

    const raw = Object.fromEntries(formData.entries());
    const parsed: PlatformWorkspaceDomainActionInput =
      platformWorkspaceDomainActionSchema.parse(raw);

    const result = await refreshPlatformWorkspaceDomainVerificationWorkflow({
      workspaceDomainId: parsed.workspaceDomainId,
    });

    return {
      workspaceDomainId: parsed.workspaceDomainId,
      verified: result.verified,
      checkedAt: result.checkedAt,
      successMessage: result.verified
        ? 'Domain verification completed successfully.'
        : 'DNS verification is still pending. Double-check the expected records and try again.',
    };
  },
);

const setPlatformWorkspacePrimaryDomainActionImpl = createAction(
  async (formData: FormData) => {
    await requirePlatformWorkspaceDomainPermission('workspaceDomain.setPrimary');

    const raw = Object.fromEntries(formData.entries());
    const parsed: PlatformWorkspaceDomainActionInput =
      platformWorkspaceDomainActionSchema.parse(raw);

    const snapshot = await setPlatformWorkspacePrimaryDomainWorkflow({
      workspaceDomainId: parsed.workspaceDomainId,
    });

    return {
      workspaceDomainId: parsed.workspaceDomainId,
      workspaceId: snapshot.workspaceId,
      primaryHost: snapshot.primaryHost,
      successMessage: `Primary route updated to ${snapshot.primaryHost}.`,
    };
  },
);

const deletePlatformWorkspaceDomainActionImpl = createAction(
  async (formData: FormData) => {
    await requirePlatformWorkspaceDomainPermission('workspaceDomain.delete');

    const raw = Object.fromEntries(formData.entries());
    const parsed: PlatformWorkspaceDomainActionInput =
      platformWorkspaceDomainActionSchema.parse(raw);

    const snapshot = await deletePlatformWorkspaceDomainWorkflow({
      workspaceDomainId: parsed.workspaceDomainId,
    });

    return {
      workspaceDomainId: parsed.workspaceDomainId,
      workspaceId: snapshot.workspaceId,
      primaryHost: snapshot.primaryHost,
      successMessage:
        'Domain record removed and routing was recalculated for the workspace.',
    };
  },
);

export async function resyncPlatformWorkspaceRoutingAction(formData: FormData) {
  return resyncPlatformWorkspaceRoutingActionImpl(formData);
}

export async function createPlatformWorkspaceCustomDomainAction(
  formData: FormData,
) {
  return createPlatformWorkspaceCustomDomainActionImpl(formData);
}

export async function createPlatformWorkspaceRedirectAliasAction(
  formData: FormData,
) {
  return createPlatformWorkspaceRedirectAliasActionImpl(formData);
}

export async function refreshPlatformWorkspaceDomainVerificationAction(
  formData: FormData,
) {
  return refreshPlatformWorkspaceDomainVerificationActionImpl(formData);
}

export async function setPlatformWorkspacePrimaryDomainAction(
  formData: FormData,
) {
  return setPlatformWorkspacePrimaryDomainActionImpl(formData);
}

export async function deletePlatformWorkspaceDomainAction(formData: FormData) {
  return deletePlatformWorkspaceDomainActionImpl(formData);
}
