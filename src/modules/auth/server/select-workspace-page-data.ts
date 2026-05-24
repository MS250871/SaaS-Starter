import { withActionReadContext } from '@/lib/request/withActionContext';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import { listIdentityWorkspaceSelectOptions } from '@/modules/workspace/services/membership.services';

export type SelectWorkspacePageData = {
  identity: {
    firstName: string | null;
    email: string | null;
  };
  workspaces: Array<{
    membershipId: string;
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    domainLabel: string;
    roleName: string;
    roleKey: string;
    roleSystemKey?: string | null;
  }>;
};

export async function getSelectWorkspacePageData(
  identityId: string,
): Promise<SelectWorkspacePageData> {
  return withActionReadContext(async () => {
    const [identity, memberships] = await Promise.all([
      getIdentityById(identityId),
      listIdentityWorkspaceSelectOptions(identityId),
    ]);

    return {
      identity: {
        firstName: identity.firstName ?? null,
        email: identity.email ?? null,
      },
      workspaces: memberships.map((membership) => ({
        membershipId: membership.id,
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        workspaceSlug: membership.workspace.slug,
        domainLabel:
          membership.workspace.defaultDomain || `/${membership.workspace.slug}`,
        roleName: membership.roleDefinition.name,
        roleKey: membership.roleKey,
        roleSystemKey: membership.roleSystemKey ?? null,
      })),
    };
  });
}
