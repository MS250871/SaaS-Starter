import type {
  SessionClaims,
  SessionPayload,
} from '@/lib/auth/auth.schema';
import type { ActorContext } from '@/lib/context/actor-context';
import { runWithActor } from '@/lib/context/actor-context';
import { buildActorContext } from '@/lib/context/build-actor';
import type { RequestContext } from '@/lib/context/request-context';
import { hydrateSessionClaims } from '@/modules/auth/services/session-access.services';

type ResolvedSessionContext = {
  actor: ActorContext;
  session: SessionPayload | null;
};

export async function resolveSessionContext(params: {
  requestContext: RequestContext;
  sessionClaims: SessionClaims | null;
}): Promise<ResolvedSessionContext> {
  const { requestContext, sessionClaims } = params;

  if (!sessionClaims) {
    requestContext.sessionClaims = null;
    requestContext.session = null;

    return {
      actor: buildActorContext(),
      session: null,
    };
  }

  const claimsActor = buildActorContext({
    identityId: sessionClaims.identityId,
    customerId: sessionClaims.customerId,
    platformRole: sessionClaims.platformRoles?.[0],
    platformRoleKeys: sessionClaims.platformRoleKeys,
    platformRoleSystemKeys: sessionClaims.platformRoleSystemKeys,
    workspaceId: sessionClaims.workspaceId,
    workspaceRole: sessionClaims.workspaceRole,
    workspaceRoleKey: sessionClaims.workspaceRoleKey,
    workspaceRoleSystemKey: sessionClaims.workspaceRoleSystemKey,
    membershipId: sessionClaims.membershipId,
  });

  const session = await runWithActor(claimsActor, () =>
    hydrateSessionClaims(sessionClaims),
  );

  requestContext.sessionClaims = sessionClaims;
  requestContext.session = session;

  return {
    actor: buildActorContext({
      identityId: session.identityId,
      customerId: session.customerId,
      platformRole: session.platformRoles?.[0],
      platformRoleKeys: session.platformRoleKeys,
      platformRoleSystemKeys: session.platformRoleSystemKeys,
      workspaceId: session.workspaceId,
      workspaceRole: session.workspaceRole,
      workspaceRoleKey: session.workspaceRoleKey,
      workspaceRoleSystemKey: session.workspaceRoleSystemKey,
      membershipId: session.membershipId,
      permissions: session.permissions,
      features: session.features,
      limits: session.limits,
    }),
    session,
  };
}
