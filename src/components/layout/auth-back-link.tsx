import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { readActorContext } from '@/lib/request/read-actor-context';
import { buildWorkspaceSurfacePath } from '@/modules/workspace/routing';
import { cn } from '@/lib/utils';

type WorkspaceRequestContext = {
  workspace?: {
    slug?: string;
    strategy?: string;
  };
};

export default async function AuthBackLink({
  className,
}: {
  className?: string;
}) {
  const { requestContext } = await readActorContext();
  const workspaceContext = (requestContext as WorkspaceRequestContext | null)
    ?.workspace;
  const href = workspaceContext?.slug
    ? buildWorkspaceSurfacePath({
        strategy: workspaceContext.strategy,
        slug: workspaceContext.slug,
        path: '/',
      })
    : '/';

  return (
    <Link
      href={href}
      className={cn(
        'absolute left-4 top-4 flex items-center gap-2 text-sm text-foreground hover:text-foreground',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      Home
    </Link>
  );
}
