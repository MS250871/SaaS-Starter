import {
  clearUserSession,
  readUserSessionCookiePayload,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createRouteHandler } from '@/lib/http/create-route-handler';
import { sessionHeartbeatWorkflow } from '@/modules/auth/workflows/session-heartbeat.workflow';

export const dynamic = 'force-dynamic';

const heartbeatRouteHandler = createRouteHandler(async () => {
  const sessionPayload = await readUserSessionCookiePayload();
  const result = await sessionHeartbeatWorkflow({
    sessionPayload,
  });

  if (!result.active) {
    await clearUserSession();

    if (result.status === 'expired') {
      throwError(ERR.TOKEN_EXPIRED, 'Session expired');
    }

    throwError(ERR.UNAUTHORIZED, 'Session not active');
  }

  if (result.sessionPayload.expiresAt !== sessionPayload?.expiresAt) {
    await setUserSession(result.sessionPayload);
  }

  return {
    active: true,
    status: result.status,
    expiresAt: result.sessionPayload.expiresAt,
  };
});

export async function GET(req: Request) {
  return heartbeatRouteHandler(req);
}
