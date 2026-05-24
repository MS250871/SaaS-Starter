'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ScreenshotVariant =
  | 'overview'
  | 'platform'
  | 'workspace'
  | 'customer'
  | 'catalog'
  | 'billing'
  | 'routing'
  | 'support';

type MarketingScreenshotFrameProps = {
  title: string;
  description: string;
  lightSrc?: string;
  darkSrc?: string;
  aspectClassName?: string;
  variant?: ScreenshotVariant;
  className?: string;
};

function WindowChrome() {
  return (
    <div className="flex items-center gap-2 border-b border-black/6 bg-white/85 px-4 py-3 dark:border-white/8 dark:bg-white/5">
      <span className="h-2.5 w-2.5 rounded-full bg-rose-400/85" />
      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/85" />
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/85" />
      <div className="ml-3 h-8 flex-1 rounded-full border border-black/7 bg-white/90 dark:border-white/10 dark:bg-white/6" />
    </div>
  );
}

function PlaceholderBars({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-3 rounded-full bg-slate-900/9 dark:bg-white/10"
          style={{
            width: `${100 - (index % 3) * 11}%`,
          }}
        />
      ))}
    </div>
  );
}

function PlaceholderScene({ variant }: { variant: ScreenshotVariant }) {
  if (variant === 'billing') {
    return (
      <div className="grid h-full gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-black/7 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/6"
            >
              <div className="h-3 w-24 rounded-full bg-slate-900/10 dark:bg-white/12" />
              <div className="mt-4 h-8 w-20 rounded-full bg-slate-900/12 dark:bg-white/14" />
            </div>
          ))}
        </div>
        <div className="grid flex-1 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-36 rounded-full bg-slate-900/10 dark:bg-white/12" />
              <div className="h-8 w-28 rounded-full bg-slate-900/10 dark:bg-white/12" />
            </div>
            <div className="mt-5 grid grid-cols-7 items-end gap-2">
              {[44, 58, 64, 52, 78, 69, 84].map((height, index) => (
                <div
                  key={index}
                  className="rounded-t-2xl bg-[linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))]"
                  style={{ height }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
            <PlaceholderBars count={6} />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-black/7 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-3 w-32 rounded-full bg-slate-900/10 dark:bg-white/12" />
                    <div className="h-6 w-20 rounded-full bg-emerald-500/18 dark:bg-emerald-400/20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'catalog') {
    return (
      <div className="grid h-full gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-black/7 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/6"
            >
              <div className="h-3 w-20 rounded-full bg-slate-900/10 dark:bg-white/12" />
              <div className="mt-4 h-8 w-16 rounded-full bg-slate-900/12 dark:bg-white/14" />
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-44 rounded-full bg-slate-900/10 dark:bg-white/12" />
            <div className="h-8 w-32 rounded-full bg-slate-900/10 dark:bg-white/12" />
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-black/7 dark:border-white/10">
            <div className="grid grid-cols-[1.5fr_repeat(5,1fr)] border-b border-black/7 bg-slate-100/70 px-4 py-3 text-xs dark:border-white/10 dark:bg-white/8">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-3 w-16 rounded-full bg-slate-900/10 dark:bg-white/12"
                />
              ))}
            </div>
            <div className="grid gap-0">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[1.5fr_repeat(5,1fr)] border-b border-black/6 bg-white/94 px-4 py-3 last:border-b-0 dark:border-white/8 dark:bg-white/4"
                >
                  {Array.from({ length: 6 }).map((__, colIndex) => (
                    <div
                      key={colIndex}
                      className={cn(
                        'h-3 rounded-full bg-slate-900/10 dark:bg-white/12',
                        colIndex === 0 ? 'w-28' : 'w-14',
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'support') {
    return (
      <div className="grid h-full gap-4 p-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-32 rounded-full bg-slate-900/10 dark:bg-white/12" />
            <div className="h-8 w-24 rounded-full bg-slate-900/10 dark:bg-white/12" />
          </div>
          <div className="mt-5 grid gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-black/7 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-3 w-28 rounded-full bg-slate-900/10 dark:bg-white/12" />
                    <div className="h-3 w-20 rounded-full bg-slate-900/8 dark:bg-white/10" />
                  </div>
                  <div className="h-6 w-18 rounded-full bg-sky-500/18 dark:bg-sky-400/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-sky-500/12 p-4 dark:bg-sky-400/12">
              <PlaceholderBars count={2} />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'max-w-[82%] rounded-3xl px-4 py-3',
                    index % 2 === 0
                      ? 'bg-slate-900/8 dark:bg-white/8'
                      : 'ml-auto bg-slate-900 text-white dark:bg-white dark:text-slate-950',
                  )}
                >
                  <PlaceholderBars count={2} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'routing') {
    return (
      <div className="grid h-full gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {['Path', 'Subdomain', 'Custom domain'].map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-black/7 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/6"
            >
              <div className="h-3 w-20 rounded-full bg-slate-900/10 dark:bg-white/12" />
              <div className="mt-4 h-8 w-28 rounded-full bg-slate-900/12 dark:bg-white/14" />
            </div>
          ))}
        </div>
        <div className="grid flex-1 gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
            <PlaceholderBars count={5} />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-black/7 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-3 w-32 rounded-full bg-slate-900/10 dark:bg-white/12" />
                    <div className="h-6 w-16 rounded-full bg-emerald-500/18 dark:bg-emerald-400/20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
            <div className="overflow-hidden rounded-2xl border border-black/7 dark:border-white/10">
              <div className="grid grid-cols-4 border-b border-black/7 bg-slate-100/70 px-4 py-3 dark:border-white/10 dark:bg-white/8">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-3 w-16 rounded-full bg-slate-900/10 dark:bg-white/12"
                  />
                ))}
              </div>
              <div className="grid gap-0">
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-4 border-b border-black/6 bg-white/94 px-4 py-3 last:border-b-0 dark:border-white/8 dark:bg-white/4"
                  >
                    {Array.from({ length: 4 }).map((__, colIndex) => (
                      <div
                        key={colIndex}
                        className={cn(
                          'h-3 rounded-full bg-slate-900/10 dark:bg-white/12',
                          colIndex === 0 ? 'w-20' : 'w-14',
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const withSidebar =
    variant === 'overview' ||
    variant === 'platform' ||
    variant === 'workspace' ||
    variant === 'customer';

  return (
    <div className="grid h-full p-4">
      <div className="grid h-full gap-4 xl:grid-cols-[0.24fr_0.76fr]">
        {withSidebar ? (
          <div className="rounded-3xl border border-black/7 bg-white/92 p-4 shadow-sm dark:border-white/10 dark:bg-white/6">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900/10 dark:bg-white/12" />
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2"
                >
                  <div className="h-8 w-8 rounded-xl bg-slate-900/9 dark:bg-white/10" />
                  <div className="h-3 w-20 rounded-full bg-slate-900/10 dark:bg-white/12" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-black/7 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/6"
              >
                <div className="h-3 w-20 rounded-full bg-slate-900/10 dark:bg-white/12" />
                <div className="mt-4 h-8 w-16 rounded-full bg-slate-900/12 dark:bg-white/14" />
              </div>
            ))}
          </div>
          <div className="grid flex-1 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
              <div className="flex items-center justify-between gap-3">
                <div className="h-4 w-32 rounded-full bg-slate-900/10 dark:bg-white/12" />
                <div className="h-8 w-28 rounded-full bg-slate-900/10 dark:bg-white/12" />
              </div>
              <div className="mt-5 grid grid-cols-8 items-end gap-2">
                {[38, 52, 46, 64, 58, 74, 68, 88].map((height, index) => (
                  <div
                    key={index}
                    className="rounded-t-2xl bg-[linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))]"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-black/7 bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/6">
              <PlaceholderBars count={6} />
              <div className="mt-5 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-black/7 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="h-3 w-24 rounded-full bg-slate-900/10 dark:bg-white/12" />
                        <div className="h-3 w-32 rounded-full bg-slate-900/8 dark:bg-white/10" />
                      </div>
                      <div className="h-6 w-16 rounded-full bg-sky-500/18 dark:bg-sky-400/20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingScreenshotFrame({
  title,
  lightSrc,
  darkSrc,
  aspectClassName = 'aspect-[16/10]',
  variant = 'overview',
  className,
}: MarketingScreenshotFrameProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const hasConfiguredImages = Boolean(lightSrc && darkSrc);
  const hasRealImages = hasConfiguredImages && !hasImageError;
  const imageAlt = useMemo(() => `${title} screenshot`, [title]);

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[1.75rem] border-border/70 bg-background/92 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:bg-background/80 dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              {title}
            </CardTitle>
          </div>
          <Badge variant="outline" className="shrink-0">
            {hasRealImages ? 'Theme-aware' : 'Image placeholder'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className={cn('relative overflow-hidden', aspectClassName)}>
          {hasRealImages ? (
            <>
              <div className="pointer-events-none absolute inset-x-[12%] bottom-4 h-8 rounded-full bg-slate-950/10 blur-2xl dark:bg-black/32" />
              <Image
                src={lightSrc!}
                alt={imageAlt}
                fill
                unoptimized
                sizes="100vw"
                onError={() => setHasImageError(true)}
                className="object-contain object-center dark:hidden"
              />
              <Image
                src={darkSrc!}
                alt={imageAlt}
                fill
                unoptimized
                sizes="100vw"
                onError={() => setHasImageError(true)}
                className="hidden object-contain object-center dark:block"
              />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.15),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.14),transparent_34%)]" />
              <div className="relative h-full bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.96))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.96))]">
                <WindowChrome />
                <PlaceholderScene variant={variant} />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
