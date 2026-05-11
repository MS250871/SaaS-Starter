import { withUnitOfWork } from '@/lib/context/unit-of-work';
import type { SessionPayload } from '@/lib/auth/auth.schema';
import { syncSessionActivity } from '@/modules/auth/services/session.services';

export type SessionHeartbeatWorkflowInput = {
  sessionPayload: SessionPayload | null;
};

export type SessionHeartbeatWorkflowResult =
  | {
      active: false;
      status: 'missing' | 'inactive' | 'expired';
      sessionPayload?: never;
    }
  | {
      active: true;
      status: 'active' | 'refreshed';
      sessionPayload: SessionPayload;
    };

export async function sessionHeartbeatWorkflow(
  input: SessionHeartbeatWorkflowInput,
): Promise<SessionHeartbeatWorkflowResult> {
  return withUnitOfWork(async () => {
    const sessionPayload = input.sessionPayload;

    if (!sessionPayload?.sessionId) {
      return {
        active: false,
        status: 'missing',
      };
    }

    const result = await syncSessionActivity(sessionPayload.sessionId);

    if (
      result.status === 'missing' ||
      result.status === 'inactive' ||
      result.status === 'expired'
    ) {
      return {
        active: false,
        status: result.status,
      };
    }

    return {
      active: true,
      status: result.status,
      sessionPayload: {
        ...sessionPayload,
        isActive: result.session.isActive,
        expiresAt: result.session.expiresAt.getTime(),
      },
    };
  });
}
