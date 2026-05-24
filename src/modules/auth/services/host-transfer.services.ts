import {
  hostTransferTokenSchema,
  type HostTransferToken,
  type SessionClaims,
} from '@/lib/auth/auth.schema';
import { decryptToken, encryptToken } from '@/lib/security/crypto';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { normalizeHostname } from '@/lib/middleware/proxy-utils';

const HOST_TRANSFER_TOKEN_MAX_AGE_MS = 5 * 60 * 1000;

export async function issueHostTransferToken(params: {
  session: Pick<SessionClaims, 'sessionId' | 'identityId'>;
  workspaceId: string;
  targetHost: string;
  intent?: 'free' | 'paid' | null;
  returnPath?: string | null;
}) {
  if (!params.session?.sessionId || !params.session.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Active session is required for host transfer.');
  }

  if (!params.workspaceId || !params.targetHost) {
    throwError(
      ERR.INVALID_INPUT,
      'workspaceId and targetHost are required for host transfer.',
    );
  }

  const normalizedTargetHost = normalizeHostname(params.targetHost);

  if (!normalizedTargetHost) {
    throwError(ERR.INVALID_INPUT, 'targetHost must be a valid hostname.');
  }

  const now = Date.now();
  const payload: HostTransferToken = {
    sessionId: params.session.sessionId,
    identityId: params.session.identityId,
    workspaceId: params.workspaceId,
    targetHost: normalizedTargetHost,
    intent: params.intent ?? undefined,
    returnPath: params.returnPath ?? undefined,
    createdAt: now,
    expiresAt: now + HOST_TRANSFER_TOKEN_MAX_AGE_MS,
  };

  return encryptToken(payload);
}

export async function readHostTransferToken(token: string) {
  if (!token) {
    return null;
  }

  const payload = await decryptToken<unknown>(token);

  if (!payload) {
    return null;
  }

  const validated = hostTransferTokenSchema.safeParse(payload);

  if (!validated.success) {
    return null;
  }

  if (Date.now() > validated.data.expiresAt) {
    return null;
  }

  return validated.data;
}

export function buildHostTransferPath(token: string) {
  if (!token) {
    throwError(ERR.INVALID_INPUT, 'token is required');
  }

  const search = new URLSearchParams({
    token,
  });

  return `/host-transfer?${search.toString()}`;
}
