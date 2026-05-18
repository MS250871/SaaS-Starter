/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';
import { Globe2, Headphones, Sparkles } from 'lucide-react';
import AuthBackLink from '@/components/layout/auth-back-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import type { WorkspaceAuthPageData } from '@/modules/workspace/server/workspace-auth-page-data';

type WorkspaceAuthShellMode =
  | 'login'
  | 'signup'
  | 'payment'
  | 'verify-email'
  | 'verify-phone';

const shellCopy: Record<
  WorkspaceAuthShellMode,
  {
    eyebrow: string;
    headline: string;
    description: string;
  }
> = {
  login: {
    eyebrow: 'Learner access',
    headline: 'Welcome back to your language portal.',
    description:
      'Continue with live classes, lesson notes, practice prompts, and progress updates in one calm, branded space.',
  },
  signup: {
    eyebrow: 'New learner account',
    headline: 'Create your account and join the next level.',
    description:
      'Set up your learner access for classes, assignments, and mentor-led language support without leaving the workspace brand.',
  },
  payment: {
    eyebrow: 'Secure checkout',
    headline: 'Complete payment without leaving your workspace brand.',
    description:
      'Review the amount, complete checkout securely, and return to your language portal with billing and delivery kept in one branded flow.',
  },
  'verify-email': {
    eyebrow: 'Email verification',
    headline: 'One quick step before your portal opens.',
    description:
      'Use the code we just sent to secure your access and continue into your workspace.',
  },
  'verify-phone': {
    eyebrow: 'Phone verification',
    headline: 'Confirm your number and continue.',
    description:
      'We use one last verification step so messages, reminders, and learner access stay tied to the right account.',
  },
};

function WorkspaceBrandMark({
  workspace,
}: {
  workspace: WorkspaceAuthPageData;
}) {
  if (workspace.logoUrl) {
    return (
      <img
        src={workspace.logoUrl}
        alt={workspace.workspaceName}
        className="h-12 w-auto object-contain"
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--workspace-primary)] text-sm font-semibold uppercase text-[var(--workspace-primary-foreground)] shadow-sm">
        {workspace.workspaceName.slice(0, 2)}
      </div>
      <span className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white [font-family:var(--workspace-heading-font)]">
        {workspace.workspaceName}
      </span>
    </div>
  );
}

function SurfaceChip({
  icon: Icon,
  children,
}: {
  icon: typeof Sparkles;
  children: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-accent-border-light)] bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/6 dark:text-slate-200">
      <Icon className="h-3.5 w-3.5 text-[var(--workspace-primary)]" />
      <span>{children}</span>
    </div>
  );
}

export function WorkspaceAuthShell({
  workspace,
  mode,
  children,
}: {
  workspace: WorkspaceAuthPageData;
  mode: WorkspaceAuthShellMode;
  children: ReactNode;
}) {
  const copy = shellCopy[mode];

  return (
    <main
      style={workspace.themeStyle}
      className="min-h-svh overflow-hidden bg-stone-50 text-slate-900 transition-colors dark:bg-[#0a1020] dark:text-slate-100 [font-family:var(--workspace-body-font)]"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top_left,var(--workspace-accent-soft-light),transparent_34%),radial-gradient(circle_at_top_right,var(--workspace-accent-soft-light),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,var(--workspace-accent-soft-dark),transparent_34%),radial-gradient(circle_at_top_right,var(--workspace-accent-soft-dark),transparent_24%)]" />

      <div className="mx-auto flex min-h-svh max-w-7xl flex-col px-6 py-6 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <AuthBackLink className="static rounded-full border border-[var(--workspace-accent-border-light)] bg-white/78 px-3 py-2 text-slate-700 shadow-sm backdrop-blur hover:text-slate-950 dark:border-white/10 dark:bg-white/6 dark:text-slate-200 dark:hover:text-white" />
          <ThemeToggle />
        </div>

        <div className="grid flex-1 gap-12 py-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center lg:py-12">
          <section className="max-w-2xl space-y-8">
            <WorkspaceBrandMark workspace={workspace} />

            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--workspace-accent-border-light)] bg-white/84 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--workspace-primary)] shadow-sm dark:border-white/10 dark:bg-white/6">
                <Sparkles className="h-3.5 w-3.5" />
                {copy.eyebrow}
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-6xl dark:text-white [font-family:var(--workspace-heading-font)]">
                  {workspace.workspaceName}
                </h1>
                <p className="max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                  {copy.headline} {copy.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <SurfaceChip icon={Sparkles}>Live classes</SurfaceChip>
              <SurfaceChip icon={Headphones}>Mentor support</SurfaceChip>
              <SurfaceChip icon={Globe2}>{workspace.domainLabel}</SurfaceChip>
            </div>

            {workspace.supportEmail ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Need help? Reach the team at{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {workspace.supportEmail}
                </span>
                .
              </p>
            ) : null}
          </section>

          <div className="w-full lg:justify-self-end">{children}</div>
        </div>
      </div>
    </main>
  );
}
