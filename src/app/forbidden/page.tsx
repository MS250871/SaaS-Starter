import Link from 'next/link';
import { readActorContext } from '@/lib/request/read-actor-context';
import {
  buildWorkspaceSurfacePath,
  normalizeWorkspaceDomainStrategy,
} from '@/modules/workspace/routing';

type WorkspaceRequestContext = {
  workspace?: {
    slug?: string;
    strategy?: string;
  };
};

function resolveFallbackHref(params: {
  actor: Awaited<ReturnType<typeof readActorContext>>['actor'];
  requestContext: unknown;
}) {
  const workspace = (params.requestContext as WorkspaceRequestContext | null)?.workspace;

  if (workspace?.slug) {
    const strategy = normalizeWorkspaceDomainStrategy(workspace.strategy);

    if (params.actor.customerId) {
      return buildWorkspaceSurfacePath({
        strategy,
        slug: workspace.slug,
        path: '/customer',
      });
    }

    if (params.actor.membershipId) {
      return buildWorkspaceSurfacePath({
        strategy,
        slug: workspace.slug,
        path: '/app',
      });
    }
  }

  return '/';
}

export default async function ForbiddenPage() {
  const { actor, requestContext } = await readActorContext();
  const fallbackHref = resolveFallbackHref({
    actor,
    requestContext,
  });
  const fallbackLabel = actor.customerId
    ? 'Go to customer portal'
    : actor.membershipId
      ? 'Go to workspace dashboard'
      : 'Go home';

  return (
    <main className="flex min-h-[70svh] items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-border/70 bg-card px-8 py-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          403 Forbidden
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          This area is not available for your current session.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          You are signed in, but this route belongs to a different access surface.
          Use the correct portal for your current account context.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={fallbackHref}
            className="inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            {fallbackLabel}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Public home
          </Link>
        </div>
      </div>
    </main>
  );
}
