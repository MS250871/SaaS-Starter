import { SupportContextType } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type SupportOwnerScope = 'workspace' | 'platform';

export function getSupportTicketOwnerScope(
  contextType: SupportContextType | string | null | undefined,
): SupportOwnerScope {
  return contextType === SupportContextType.PLATFORM ? 'platform' : 'workspace';
}

export function isPlatformOwnedSupportContext(
  contextType: SupportContextType | string | null | undefined,
) {
  return getSupportTicketOwnerScope(contextType) === 'platform';
}

export function isWorkspaceOwnedSupportContext(
  contextType: SupportContextType | string | null | undefined,
) {
  return getSupportTicketOwnerScope(contextType) === 'workspace';
}

export function assertWorkspaceOwnedSupportContext(
  contextType: SupportContextType | string | null | undefined,
) {
  if (isWorkspaceOwnedSupportContext(contextType)) {
    return;
  }

  throwError(
    ERR.FORBIDDEN,
    'This ticket is managed by platform support and cannot be controlled from the workspace desk.',
  );
}

export function assertPlatformOwnedSupportContext(
  contextType: SupportContextType | string | null | undefined,
) {
  if (isPlatformOwnedSupportContext(contextType)) {
    return;
  }

  throwError(
    ERR.FORBIDDEN,
    'This ticket is managed by the workspace support desk and cannot be controlled from the platform desk.',
  );
}

export function getSupportContextLabel(
  contextType: SupportContextType | string | null | undefined,
) {
  switch (contextType) {
    case SupportContextType.PLATFORM:
      return 'Platform escalation';
    case SupportContextType.CUSTOMER:
      return 'Customer support ticket';
    case SupportContextType.WORKSPACE:
      return 'Workspace support ticket';
    default:
      return 'Support ticket';
  }
}
