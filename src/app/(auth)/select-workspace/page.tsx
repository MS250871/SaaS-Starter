import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getAuthCookie, getUserSession } from '@/lib/auth/auth-cookies';
import { PlatformAuthShell } from '@/modules/auth/components/platform-auth-shell';
import { getSelectWorkspacePageData } from '@/modules/auth/server/select-workspace-page-data';

function resolveWorkspaceSelectionError(error: string | null) {
  switch (error) {
    case 'access-denied':
      return 'You no longer have access to that workspace.';
    case 'workspace-unavailable':
      return 'That workspace is not active right now.';
    case 'selection-failed':
      return 'We could not continue into that workspace. Please try again.';
    default:
      return null;
  }
}

export default async function SelectWorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [identitySession, auth] = await Promise.all([
    getUserSession(),
    getAuthCookie(),
  ]);
  const params = searchParams ? await searchParams : undefined;

  if (!identitySession?.identityId) {
    redirect('/login');
  }

  if (
    !auth ||
    auth.flow !== 'login' ||
    auth.mode !== 'normal' ||
    auth.entry !== 'platform'
  ) {
    redirect('/post-login');
  }

  if (auth.workspaceId) {
    redirect('/post-login');
  }

  const data = await getSelectWorkspacePageData(identitySession.identityId);

  if (data.workspaces.length <= 1) {
    redirect('/post-login');
  }

  const greetingName = data.identity.firstName?.trim() || 'there';
  const errorCode = params?.error;
  const errorMessage = resolveWorkspaceSelectionError(
    typeof errorCode === 'string' ? errorCode : null,
  );

  return (
    <PlatformAuthShell mode="select-workspace">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">
            Choose your workspace
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            Welcome back, {greetingName}. Your account can manage more than one
            workspace, so choose where you want to continue.
          </CardDescription>
          {data.identity.email ? (
            <p className="text-xs text-muted-foreground">{data.identity.email}</p>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Workspace selection failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-4">
            {data.workspaces.map((workspace) => (
              <div
                key={workspace.membershipId}
                className="rounded-xl border border-border/70 bg-background/70 p-4 shadow-sm transition-colors hover:bg-muted/30"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">
                        {workspace.workspaceName}
                      </h2>
                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {workspace.roleName}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Slug: {workspace.workspaceSlug}</p>
                      <p>Entry: {workspace.domainLabel}</p>
                    </div>
                  </div>

                  <form
                    action="/select-workspace/continue"
                    method="post"
                    className="w-full md:w-auto"
                  >
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={workspace.workspaceId}
                    />
                    <Button type="submit" className="w-full md:w-auto">
                      Continue to workspace
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PlatformAuthShell>
  );
}
