import type { ReactNode } from 'react';
import { Building2, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import AuthBackLink from '@/components/layout/auth-back-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';

type PlatformAuthShellMode =
  | 'login'
  | 'signup'
  | 'payment'
  | 'create-workspace'
  | 'verify-email'
  | 'verify-phone';

const shellCopy: Record<
  PlatformAuthShellMode,
  {
    eyebrow: string;
    headline: string;
    description: string;
  }
> = {
  login: {
    eyebrow: 'Platform access',
    headline: 'Step back into your platform workspace.',
    description:
      'Manage billing, domains, workspaces, invites, and operations from one polished control layer built for teams that scale.',
  },
  signup: {
    eyebrow: 'Workspace owner signup',
    headline: 'Launch your next workspace with a strong operational base.',
    description:
      'Create your owner account, set up the first workspace, and move from branding to delivery without stitching tools together.',
  },
  payment: {
    eyebrow: 'Secure billing',
    headline: 'Complete payment and continue with platform setup.',
    description:
      'Use the same owner-first platform surface to activate plans, unlock domain upgrades, and return straight to your billing or workspace setup flow.',
  },
  'create-workspace': {
    eyebrow: 'Workspace setup',
    headline: 'Name the workspace and make the front door real.',
    description:
      'This is where the owner onboarding turns into a live workspace URL, ready for your team, billing, branding, and learner-facing site.',
  },
  'verify-email': {
    eyebrow: 'Secure account setup',
    headline: 'Confirm your email and continue.',
    description:
      'We keep the owner onboarding flow protected so billing, domains, and team access stay attached to the right account.',
  },
  'verify-phone': {
    eyebrow: 'One more verification step',
    headline: 'Confirm your phone and finish access.',
    description:
      'This helps us keep team access, alerts, and authentication flows reliable across the platform.',
  },
};

function SurfaceChip({
  icon: Icon,
  children,
}: {
  icon: typeof Sparkles;
  children: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/6 dark:text-slate-200">
      <Icon className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100" />
      <span>{children}</span>
    </div>
  );
}

export function PlatformAuthShell({
  mode,
  children,
}: {
  mode: PlatformAuthShellMode;
  children: ReactNode;
}) {
  const copy = shellCopy[mode];

  return (
    <main
      className="relative min-h-svh overflow-hidden bg-background text-foreground transition-colors"
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.03),transparent_22rem)] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_22rem)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.05),transparent_32%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.04),transparent_22%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.03),transparent_22%)]" />

      <div className="mx-auto flex min-h-svh max-w-7xl flex-col px-6 py-6 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <AuthBackLink className="static rounded-full border border-black/10 bg-white/78 px-3 py-2 text-slate-700 shadow-sm backdrop-blur hover:text-slate-950 dark:border-white/10 dark:bg-white/6 dark:text-slate-200 dark:hover:text-white" />
          <ThemeToggle />
        </div>

        <div className="grid flex-1 gap-12 py-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center lg:py-12">
          <section className="max-w-2xl space-y-8">
            <Logo />

            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/84 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/6 dark:text-slate-200">
                <Sparkles className="h-3.5 w-3.5" />
                {copy.eyebrow}
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-6xl dark:text-white">
                  {copy.headline}
                </h1>
                <p className="max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                  {copy.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <SurfaceChip icon={Building2}>Workspace owners</SurfaceChip>
              <SurfaceChip icon={Layers3}>Billing & domains</SurfaceChip>
              <SurfaceChip icon={ShieldCheck}>Secure access</SurfaceChip>
            </div>
          </section>

          <div className="w-full lg:justify-self-end">{children}</div>
        </div>
      </div>
    </main>
  );
}
