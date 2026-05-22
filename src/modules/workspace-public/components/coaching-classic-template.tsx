/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Languages,
  LogIn,
  Sparkles,
  UserPlus2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import type { WorkspacePublicTemplateData } from '@/modules/workspace-public/contracts';

function BrandMark({ data }: { data: WorkspacePublicTemplateData }) {
  if (data.page.site.logoUrl) {
    return (
      <img
        src={data.page.site.logoUrl}
        alt={data.page.site.name}
        className="h-11 w-auto object-contain"
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-(--workspace-primary) text-sm font-semibold uppercase text-(--workspace-primary-foreground) shadow-sm">
        {data.page.site.name.slice(0, 2)}
      </div>
      <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 [font-family:var(--workspace-heading-font)]">
        {data.page.site.name}
      </span>
    </div>
  );
}

function HeaderActions({ data }: { data: WorkspacePublicTemplateData }) {
  if (data.continuePath && data.continueLabel) {
    return (
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button
          asChild
          className="rounded-full bg-(--workspace-primary) px-5 text-(--workspace-primary-foreground) hover:opacity-95"
        >
          <Link href={data.continuePath}>
            {data.continueLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      <Button
        asChild
        variant="ghost"
        className="rounded-full text-slate-700 hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <Link href={data.loginPath}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign in
        </Link>
      </Button>
      <Button
        asChild
        className="rounded-full bg-(--workspace-primary) px-5 text-(--workspace-primary-foreground) hover:opacity-95"
      >
        <Link href={data.signupPath}>
          <UserPlus2 className="mr-2 h-4 w-4" />
          Learner signup
        </Link>
      </Button>
    </div>
  );
}

export function CoachingClassicTemplate({
  data,
}: {
  data: WorkspacePublicTemplateData;
}) {
  return (
    <main
      style={data.themeStyle}
      className="min-h-svh bg-stone-50 text-slate-900 transition-colors dark:bg-[#0a1020] dark:text-slate-100 [font-family:var(--workspace-body-font)]"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-136 bg-[radial-gradient(circle_at_top_left,var(--workspace-accent-soft-light),transparent_34%),radial-gradient(circle_at_top_right,var(--workspace-accent-soft-light),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,var(--workspace-accent-soft-dark),transparent_34%),radial-gradient(circle_at_top_right,var(--workspace-accent-soft-dark),transparent_28%)]" />

      <header className="sticky top-0 z-20 border-b border-black/5 bg-stone-50/88 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a1020]/88">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 md:px-10">
          <BrandMark data={data} />

          <nav className="hidden items-center gap-8 text-sm text-slate-600 lg:flex dark:text-slate-300">
            {data.page.site.nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-slate-950 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <HeaderActions data={data} />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 py-16 md:px-10 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:py-24">
        <div className="space-y-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-(--workspace-accent-border-light) bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-(--workspace-primary) shadow-sm dark:border-white/12 dark:bg-white/6">
            <Sparkles className="h-3.5 w-3.5" />
            {data.page.hero.eyebrow}
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-slate-950 md:text-7xl dark:text-white [font-family:var(--workspace-heading-font)]">
              {data.page.hero.headline}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              {data.page.hero.subheadline}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-(--workspace-primary) px-6 text-(--workspace-primary-foreground) hover:opacity-95"
            >
              <Link href={data.page.hero.primaryAction.href}>
                {data.page.hero.primaryAction.label}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-(--workspace-accent-border-light) bg-transparent px-6 text-slate-800 hover:bg-white/70 dark:border-white/12 dark:text-slate-100 dark:hover:bg-white/10"
            >
              <Link href={data.page.hero.secondaryAction.href}>
                {data.page.hero.secondaryAction.label}
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-5 top-10 h-24 w-24 rounded-full bg-(--workspace-accent-soft-light) blur-2xl dark:bg-(--workspace-accent-soft-dark)" />
          <div className="absolute bottom-4 right-0 h-28 w-28 rounded-full bg-(--workspace-accent-soft-light) blur-2xl dark:bg-(--workspace-accent-soft-dark)" />

          <Card className="relative overflow-hidden border border-(--workspace-accent-border-light) bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <CardContent className="space-y-8 p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--workspace-primary)">
                    Popular tracks
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white [font-family:var(--workspace-heading-font)]">
                    Level-based language programs built for real fluency.
                  </h2>
                </div>
                <div className="rounded-2xl bg-(--workspace-accent-soft-light) p-3 text-(--workspace-primary) dark:bg-white/10">
                  <Languages className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-3">
                {data.page.courses.map((course) => (
                  <div
                    key={course.title}
                    className="rounded-3xl border border-(--workspace-accent-border-light) bg-stone-50/90 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          {course.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {course.language} · {course.level}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
                        {course.meta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="why-us" className="mx-auto max-w-7xl px-6 py-6 md:px-10">
        <div className="mb-8 max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--workspace-primary)">
            Why learners choose us
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl dark:text-white [font-family:var(--workspace-heading-font)]">
            Structured coaching that still feels personal.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {data.page.features.map((feature) => (
            <Card
              key={feature.title}
              className="border border-(--workspace-accent-border-light) bg-white/92 shadow-sm dark:border-white/10 dark:bg-white/6"
            >
              <CardContent className="space-y-4 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-(--workspace-accent-soft-light) text-(--workspace-primary) dark:bg-white/10">
                  <Check className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-950 dark:text-white [font-family:var(--workspace-heading-font)]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-7xl px-6 py-18 md:px-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--workspace-primary)">
              Courses
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl dark:text-white [font-family:var(--workspace-heading-font)]">
              Choose the language and level that fits your next step.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Beginner, intermediate, conversation-focused, or advanced
            communication tracks for learners who want consistent progress.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {data.page.courses.map((course) => (
            <Card
              key={course.title}
              className="border border-(--workspace-accent-border-light) bg-white/94 shadow-sm dark:border-white/10 dark:bg-white/6"
            >
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-(--workspace-accent-soft-light) px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-(--workspace-primary) dark:bg-white/10">
                    {course.language}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {course.level}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-slate-950 dark:text-white [font-family:var(--workspace-heading-font)]">
                    {course.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {course.description}
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {course.meta}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="reviews" className="mx-auto max-w-7xl px-6 py-18 md:px-10">
        <div className="mb-8 max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--workspace-primary)">
            Testimonials
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl dark:text-white [font-family:var(--workspace-heading-font)]">
            Learners stay because the progress feels real.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {data.page.testimonials.map((item) => (
            <Card
              key={`${item.name}-${item.role}`}
              className="border border-(--workspace-accent-border-light) bg-white/92 shadow-sm dark:border-white/10 dark:bg-white/6"
            >
              <CardContent className="space-y-5 p-6">
                <p className="text-base leading-8 text-slate-700 dark:text-slate-200">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {item.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.role}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-18 md:px-10">
        <div className="overflow-hidden rounded-[2rem] border border-(--workspace-accent-border-light) bg-[linear-gradient(135deg,var(--workspace-primary),var(--workspace-accent))] text-(--workspace-primary-foreground) shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="grid gap-8 px-8 py-10 md:px-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--workspace-primary-foreground)/80">
                {data.page.ctaStrip.eyebrow}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl [font-family:var(--workspace-heading-font)]">
                {data.page.ctaStrip.headline}
              </h2>
              <p className="text-base leading-8 text-(--workspace-primary-foreground)/85">
                {data.page.ctaStrip.subheadline}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white px-6 text-slate-950 hover:bg-white/90"
              >
                <Link href={data.page.ctaStrip.primaryAction.href}>
                  {data.page.ctaStrip.primaryAction.label}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent px-6 text-white hover:bg-white/10"
              >
                <Link href={data.page.ctaStrip.secondaryAction.href}>
                  {data.page.ctaStrip.secondaryAction.label}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white/88 dark:border-white/10 dark:bg-white/4">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1fr_auto] md:px-10">
          <div className="space-y-4">
            <BrandMark data={data} />
            <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {data.page.footer.blurb}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {data.page.footer.supportLabel}:{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {data.page.footer.supportValue}
              </span>
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Quick links
            </p>
            <div className="flex flex-col gap-2 text-slate-600 dark:text-slate-300">
              <Link
                href={data.homePath}
                className="transition-colors hover:text-slate-950 dark:hover:text-white"
              >
                Home
              </Link>
              <Link
                href={data.loginPath}
                className="transition-colors hover:text-slate-950 dark:hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href={data.signupPath}
                className="transition-colors hover:text-slate-950 dark:hover:text-white"
              >
                Learner signup
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-black/5 px-6 py-4 text-center text-xs tracking-[0.16em] text-slate-500 dark:border-white/10 dark:text-slate-400 md:px-10">
          {data.page.footer.legalLine}
        </div>
      </footer>
    </main>
  );
}
