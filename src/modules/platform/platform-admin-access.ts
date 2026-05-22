import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  assertPermission,
  hasAnyPermission,
} from '@/modules/permissions/services/permissions.services';

function hasPlatformRole(roleSystemKeys: string[], roleKeys?: string[]) {
  return roleSystemKeys.length > 0 || (roleKeys?.length ?? 0) > 0;
}

export function assertPlatformAccess(params: {
  roleSystemKeys: string[];
  roleKeys?: string[];
}) {
  if (!hasPlatformRole(params.roleSystemKeys, params.roleKeys)) {
    throwError(ERR.FORBIDDEN, 'Platform access is required.');
  }
}

export function assertPlatformAdminAccess(roleSystemKeys: string[]) {
  assertPlatformAccess({ roleSystemKeys });

  if (roleSystemKeys.includes('PLATFORM_ADMIN')) {
    return;
  }

  throwError(ERR.FORBIDDEN, 'Platform admin access is required.');
}

export function assertPlatformPermission(params: {
  roleSystemKeys: string[];
  roleKeys?: string[];
  permissions: string[];
  required: string;
}) {
  assertPlatformAccess(params);
  assertPermission(params.permissions, params.required);
}

export function assertPlatformAnyPermission(params: {
  roleSystemKeys: string[];
  roleKeys?: string[];
  permissions: string[];
  required: string[];
}) {
  assertPlatformAccess(params);

  if (hasAnyPermission(params.permissions, params.required)) {
    return;
  }

  throwError(
    ERR.FORBIDDEN,
    `Platform permission denied: ${params.required.join(' or ')}`,
  );
}
