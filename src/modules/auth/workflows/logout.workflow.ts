import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { endSession, findSessionById } from '@/modules/auth/services/session.services';

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

    const session = await findSessionById(input.sessionId);

    if (!session) {
      return {};
    }

    await endSession(session.id);

    return {
      endedSessionId: session.id,
    };
  });
}
