/* eslint-disable @next/next/no-img-element */
import { redirect } from 'next/navigation';
import AuthBackLink from '@/components/layout/auth-back-link';
import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { readActorContext } from '@/lib/request/read-actor-context';
import { PaymentCheckoutPanel } from '@/modules/billing/components/payment-checkout-panel';
import { getPaymentPageData } from '@/modules/billing/server/payment-page-data';
import { buildWorkspaceSurfacePath } from '@/modules/workspace/routing';
import {
  getWorkspaceAuthPageData,
  type WorkspaceAuthPageData,
} from '@/modules/workspace/server/workspace-auth-page-data';

function WorkspacePaymentBrand({
  workspace,
}: {
  workspace: WorkspaceAuthPageData;
}) {
  if (workspace.logoUrl) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={workspace.logoUrl}
          alt={workspace.workspaceName}
          className="h-10 w-auto max-w-[9rem] object-contain"
        />
        <span className="truncate text-base font-semibold text-slate-950 dark:text-white [font-family:var(--workspace-heading-font)]">
          {workspace.workspaceName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--workspace-primary)] text-sm font-semibold uppercase text-[var(--workspace-primary-foreground)] shadow-sm">
        {workspace.workspaceName.slice(0, 2)}
      </div>
      <span className="truncate text-base font-semibold text-slate-950 dark:text-white [font-family:var(--workspace-heading-font)]">
        {workspace.workspaceName}
      </span>
    </div>
  );
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const { actor } = await readActorContext();
  const workspaceAuth = await getWorkspaceAuthPageData();

  if (workspaceAuth?.canonicalRedirectUrl) {
    redirect(workspaceAuth.canonicalRedirectUrl);
  }

  const data = await getPaymentPageData(resolvedSearchParams);

  const backHref = actor.membershipId
    ? buildWorkspaceSurfacePath({
        strategy: workspaceAuth?.strategy,
        slug: workspaceAuth?.workspaceSlug,
        path: '/app',
      })
    : actor.customerId
      ? buildWorkspaceSurfacePath({
          strategy: workspaceAuth?.strategy,
          slug: workspaceAuth?.workspaceSlug,
          path: '/customer',
        })
      : workspaceAuth?.homePath ?? '/';

  const topBarBackClassName = workspaceAuth
    ? 'static rounded-full border border-[var(--workspace-accent-border-light)] bg-white/78 px-3 py-2 text-slate-700 shadow-sm backdrop-blur hover:text-slate-950 dark:border-white/10 dark:bg-white/6 dark:text-slate-200 dark:hover:text-white'
    : 'static rounded-full border border-black/10 bg-white/78 px-3 py-2 text-slate-700 shadow-sm backdrop-blur hover:text-slate-950 dark:border-white/10 dark:bg-white/6 dark:text-slate-200 dark:hover:text-white';

  return (
    <main
      style={workspaceAuth?.themeStyle}
      className={
        workspaceAuth
          ? 'relative min-h-svh overflow-hidden bg-stone-50 text-slate-900 transition-colors dark:bg-[#0a1020] dark:text-slate-100 [font-family:var(--workspace-body-font)]'
          : 'relative min-h-svh overflow-hidden bg-background text-foreground transition-colors'
      }
    >
      <div
        className={
          workspaceAuth
            ? 'absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_top_left,var(--workspace-accent-soft-light),transparent_34%),radial-gradient(circle_at_top_right,var(--workspace-accent-soft-light),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,var(--workspace-accent-soft-dark),transparent_34%),radial-gradient(circle_at_top_right,var(--workspace-accent-soft-dark),transparent_24%)]'
            : 'absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.03),transparent_22rem)] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_22rem)]'
        }
      />

      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 py-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <AuthBackLink className={topBarBackClassName} href={backHref} />
            {workspaceAuth ? <WorkspacePaymentBrand workspace={workspaceAuth} /> : <Logo />}
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-start justify-center py-10 md:py-12">
          <PaymentCheckoutPanel
            {...data}
            embedded
            workspaceSurface={Boolean(workspaceAuth)}
          />
        </div>
      </div>
    </main>
  );
}
