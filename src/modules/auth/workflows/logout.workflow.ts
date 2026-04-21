import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { endSession } from '@/modules/auth/services/session.services';
import { sessionQueries } from '@/modules/auth/db';

export type LogoutWorkflowInput = {
  sessionId?: string;
};

export type LogoutWorkflowResult = {
  endedSessionId?: string;
};

export async function logoutWorkflow(
  input: LogoutWorkflowInput,
): Promise<LogoutWorkflowResult> {
  return withUnitOfWork(async () => {
    if (!input.sessionId) {
      return {};
    }

    const session = await sessionQueries.byId(input.sessionId);

    if (!session) {
      return {};
    }

    await endSession(session.id);

    return {
      endedSessionId: session.id,
    };
  });
}
