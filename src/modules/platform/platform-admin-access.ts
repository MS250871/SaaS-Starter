import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export function assertPlatformAdminAccess(roleSystemKeys: string[]) {
  if (!roleSystemKeys.includes('PLATFORM_ADMIN')) {
    throwError(
      ERR.FORBIDDEN,
      'Platform admin access is required for catalog management.',
    );
  }
}
