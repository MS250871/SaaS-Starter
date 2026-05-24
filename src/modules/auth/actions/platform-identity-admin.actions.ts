'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';
import { setIdentityActive } from '@/modules/auth/services/identity.services';
import {
  endAllIdentitySessions,
  endSession,
} from '@/modules/auth/services/session.services';
import { SessionEndReason } from '@/generated/prisma/client';

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

const togglePlatformIdentityActiveActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const identityId = String(formData.get('identityId') ?? '').trim();
    const isActive =
      String(formData.get('isActive') ?? '').trim().toLowerCase() === 'true';

    if (!identityId) {
      throwError(ERR.INVALID_INPUT, 'Identity ID is required');
    }

    const identity = await setIdentityActive(identityId, isActive);

    if (!isActive) {
      await endAllIdentitySessions(identityId, SessionEndReason.REVOKED);
    }

    return {
      identityId: identity.id,
      successMessage: `Identity ${
        isActive ? 'activated' : 'deactivated'
      } successfully.`,
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const isActive =
          String(formData.get('isActive') ?? '').trim().toLowerCase() ===
          'true';

        return {
          scope: 'PLATFORM' as const,
          category: 'SECURITY' as const,
          source: 'ADMIN_PANEL' as const,
          action: isActive
            ? 'platform.identity.activate'
            : 'platform.identity.deactivate',
          entityType: 'Identity',
          entityId: result.identityId,
          description: result.successMessage,
          newValue: {
            isActive,
          },
        };
      },
    },
  },
);

const revokePlatformSessionActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const sessionId = String(formData.get('sessionId') ?? '').trim();

    if (!sessionId) {
      throwError(ERR.INVALID_INPUT, 'Session ID is required');
    }

    const session = await endSession(sessionId, SessionEndReason.REVOKED);

    return {
      sessionId: session.id,
      successMessage: 'Session revoked successfully.',
    };
  },
  {
    audit: {
      onSuccess: ({ result }) => ({
        scope: 'PLATFORM',
        category: 'SECURITY',
        source: 'ADMIN_PANEL',
        action: 'platform.session.revoke',
        entityType: 'Session',
        entityId: result.sessionId,
        description: result.successMessage,
      }),
    },
  },
);

export async function togglePlatformIdentityActiveAction(formData: FormData) {
  return togglePlatformIdentityActiveActionImpl(formData);
}

export async function revokePlatformSessionAction(formData: FormData) {
  return revokePlatformSessionActionImpl(formData);
}
