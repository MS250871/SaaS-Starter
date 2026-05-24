import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthCookieDescriptor,
  getAuthCookie,
  getUserSession,
} from '@/lib/auth/auth-cookies';
import { buildActorContext } from '@/lib/context/build-actor';
import { runWithActor } from '@/lib/context/actor-context';
import { extractAppError } from '@/lib/errors/app-error';
import { tryWriteAuditInputs, writeAuditInputs } from '@/lib/http/action-audit';
import { buildPublicUrl as buildRequestPublicUrl } from '@/lib/http/public-url';
import { withRequestContext } from '@/lib/request/withRequestContext';
import {
  selectWorkspaceActionSchema,
  type SelectWorkspaceActionInput,
} from '@/modules/auth/schema';
import { selectWorkspaceForLoginWorkflow } from '@/modules/auth/workflows/select-workspace.workflow';

function buildPublicUrl(req: NextRequest, path: string) {
  return buildRequestPublicUrl({
    path,
    host: req.headers.get('host'),
    forwardedHost: req.headers.get('x-forwarded-host'),
    forwardedProto: req.headers.get('x-forwarded-proto'),
    fallbackUrl: req.url,
  });
}

function buildErrorRedirectUrl(req: NextRequest, errorCode: string) {
  const url = buildPublicUrl(req, '/select-workspace');
  url.searchParams.set('error', errorCode);
  return url;
}

export async function POST(req: NextRequest) {
  return withRequestContext(req, async () => {
    let parsed: SelectWorkspaceActionInput | null = null;
    const identitySession = await getUserSession();
    const auth = await getAuthCookie();

    const currentActor = identitySession
      ? buildActorContext({
          identityId: identitySession.identityId,
          customerId: identitySession.customerId,
          platformRole: identitySession.platformRoles?.[0],
          platformRoleKeys: identitySession.platformRoleKeys,
          platformRoleSystemKeys: identitySession.platformRoleSystemKeys,
          workspaceId: identitySession.workspaceId,
          workspaceRole: identitySession.workspaceRole,
          workspaceRoleKey: identitySession.workspaceRoleKey,
          workspaceRoleSystemKey: identitySession.workspaceRoleSystemKey,
          membershipId: identitySession.membershipId,
          permissions: identitySession.permissions,
          features: identitySession.features,
          limits: identitySession.limits,
        })
      : null;

    try {
      if (!identitySession?.identityId) {
        return NextResponse.redirect(
          buildPublicUrl(req, '/login?expired=session'),
          303,
        );
      }

      if (!auth) {
        return NextResponse.redirect(
          buildPublicUrl(req, '/login?expired=session'),
          303,
        );
      }

      if (
        auth.flow !== 'login' ||
        auth.mode !== 'normal' ||
        auth.entry !== 'platform'
      ) {
        return NextResponse.redirect(buildPublicUrl(req, '/post-login'), 303);
      }

      if (auth.workspaceId) {
        return NextResponse.redirect(buildPublicUrl(req, '/post-login'), 303);
      }

      const formData = await req.formData();
      const raw = Object.fromEntries(formData.entries());
      parsed = selectWorkspaceActionSchema.parse(raw);
      const selection = parsed;

      const executeSelection = async () => {
        const workflowResult = await selectWorkspaceForLoginWorkflow({
          identityId: identitySession.identityId,
          workspaceId: selection.workspaceId,
        });

        await writeAuditInputs({
          category: 'AUTH',
          source: 'AUTH',
          action: 'auth.workspace.select',
          entityType: 'Workspace',
          entityId: workflowResult.workspaceId,
          description: `Workspace ${workflowResult.workspaceName} selected for login.`,
          metadata: {
            membershipId: workflowResult.membershipId,
            roleKey: workflowResult.roleKey,
            roleSystemKey: workflowResult.roleSystemKey,
          },
          sessionId: identitySession.sessionId,
        });

        return workflowResult;
      };

      const result = currentActor
        ? await runWithActor(currentActor, executeSelection)
        : await executeSelection();

      const authCookie = await buildAuthCookieDescriptor({
        ...auth,
        workspaceId: result.workspaceId,
        createdAt: Date.now(),
      });

      const response = NextResponse.redirect(
        buildPublicUrl(req, '/post-login'),
        303,
      );

      response.cookies.set(
        authCookie.name,
        authCookie.value,
        authCookie.options,
      );

      return response;
    } catch (error) {
      const appError = extractAppError(error);
      const errorCode =
        appError?.code === 'UNAUTHORIZED'
          ? 'access-denied'
          : appError?.code === 'INVALID_STATE'
            ? 'workspace-unavailable'
            : 'selection-failed';

      if (currentActor) {
        await runWithActor(currentActor, () =>
          tryWriteAuditInputs(
            {
              category: 'AUTH',
              source: 'AUTH',
              action: 'auth.workspace.select',
              entityType: 'Workspace',
              entityId: parsed?.workspaceId,
              description: 'Workspace selection failed.',
              metadata: {
                errorCode: appError?.code ?? 'UNKNOWN',
              },
              outcome: 'FAILURE',
              sessionId: identitySession?.sessionId,
            },
            'route_select_workspace_error',
          ),
        );
      }

      return NextResponse.redirect(buildErrorRedirectUrl(req, errorCode), 303);
    }
  });
}
