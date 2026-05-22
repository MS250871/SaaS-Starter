import { withActionTxContext } from '@/lib/request/withActionContext';
import { getGovernancePermissionAdminSnapshot } from '@/modules/permissions/services/permissions.services';

export async function getPlatformGovernancePermissionEditorData(permissionId?: string) {
  return withActionTxContext(async () => {
    const permission = permissionId
      ? await getGovernancePermissionAdminSnapshot(permissionId)
      : null;

    return {
      permission,
    };
  });
}

export async function getPlatformGovernancePermissionDetailData(permissionId: string) {
  return withActionTxContext(async () => {
    const permission = await getGovernancePermissionAdminSnapshot(permissionId);

    return {
      permission,
    };
  });
}
