import { cache } from 'react';
import { headers } from 'next/headers';
import { buildActorContext } from '@/lib/context/build-actor';
import { runWithContext } from '@/lib/context/request-context';
import { readSessionClaimsFromHeaders } from '@/lib/request/session-claims';
import { resolveSessionContext } from '@/lib/request/resolve-session-context';

export type ActorContextSnapshot = {
  sessionId?: string;
  identityId?: string;
  customerId?: string;
  workspaceId?: string;
  membershipId?: string;
  workspaceRoleId?: string;
  workspaceRoleKey?: string;
  workspaceRoleSystemKey?: string;
  workspaceRole?: string;
  platformRole?: string;
  platformRoleIds: string[];
  platformRoleKeys: string[];
  platformRoleSystemKeys: string[];
  platformRoles: string[];
  permissions: string[];
  features: string[];
  limits: Record<string, number>;
};

const readActorContextCached = cache(async () => {
  const hdrs = await headers();
  const rawRequestContext = hdrs.get('x-request-context');
  const sessionClaims = readSessionClaimsFromHeaders((name) => hdrs.get(name));

  if (!rawRequestContext) {
    const actor = buildActorContext({
      identityId: sessionClaims?.identityId,
      customerId: sessionClaims?.customerId,
      platformRole: sessionClaims?.platformRoles?.[0],
      platformRoleKeys: sessionClaims?.platformRoleKeys,
      platformRoleSystemKeys: sessionClaims?.platformRoleSystemKeys,
      workspaceId: sessionClaims?.workspaceId,
      workspaceRole: sessionClaims?.workspaceRole,
      workspaceRoleKey: sessionClaims?.workspaceRoleKey,
      workspaceRoleSystemKey: sessionClaims?.workspaceRoleSystemKey,
      membershipId: sessionClaims?.membershipId,
    });

    return {
      actor: {
        sessionId: sessionClaims?.sessionId,
        identityId: actor.identityId,
        customerId: actor.customerId,
        workspaceId: actor.workspaceId,
        membershipId: actor.membershipId,
        workspaceRoleId: sessionClaims?.workspaceRoleId,
        workspaceRoleKey: actor.workspaceRoleKey,
        workspaceRoleSystemKey: actor.workspaceRoleSystemKey,
        workspaceRole: actor.workspaceRole,
        platformRole: actor.platformRole,
        platformRoleIds: sessionClaims?.platformRoleIds ?? [],
        platformRoleKeys: actor.platformRoleKeys ?? [],
        platformRoleSystemKeys: actor.platformRoleSystemKeys ?? [],
        platformRoles: sessionClaims?.platformRoles ?? [],
        permissions: actor.permissions,
        features: actor.features,
        limits: actor.limits,
      } satisfies ActorContextSnapshot,
      requestContext: null,
    };
  }

  const requestContext = JSON.parse(rawRequestContext);

  return runWithContext(requestContext, async () => {
    const { actor, session } = await resolveSessionContext({
      requestContext,
      sessionClaims,
    });

    return {
      actor: {
        sessionId: session?.sessionId,
        identityId: actor.identityId,
        customerId: actor.customerId,
        workspaceId: actor.workspaceId,
        membershipId: actor.membershipId,
        workspaceRoleId: session?.workspaceRoleId,
        workspaceRoleKey: actor.workspaceRoleKey,
        workspaceRoleSystemKey: actor.workspaceRoleSystemKey,
        workspaceRole: actor.workspaceRole,
        platformRole: actor.platformRole,
        platformRoleIds: session?.platformRoleIds ?? [],
        platformRoleKeys: actor.platformRoleKeys ?? [],
        platformRoleSystemKeys: actor.platformRoleSystemKeys ?? [],
        platformRoles: session?.platformRoles ?? [],
        permissions: actor.permissions,
        features: actor.features,
        limits: actor.limits,
      } satisfies ActorContextSnapshot,
      requestContext,
    };
  });
});

export async function readActorContext() {
  return readActorContextCached();
}
