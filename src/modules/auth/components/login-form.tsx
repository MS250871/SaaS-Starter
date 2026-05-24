'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginFormSchema, type LoginFormInput } from '@/modules/auth/schema';
import { loginAction } from '@/modules/auth/actions/login.action';
import { googleAuthAction } from '@/modules/auth/actions/google-auth.action';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GoogleButton } from './google-button';
import { Logo } from '@/components/layout/logo';
import type { AuthCookies } from '@/lib/auth/auth.schema';
import { isNextRedirectError } from '@/lib/http/is-next-redirect-error';
import { buildWorkspaceSignupPath } from '@/modules/workspace/routing';

export function LoginForm({
  className,
  intent,
  entry,
  workspaceId,
  workspaceSlug,
  workspaceStrategy,
  returnPath,
  message,
  workspaceSurface = false,
  hideTopBrand = false,
}: {
  className?: string;
  intent: AuthCookies['intent'];
  entry?: AuthCookies['entry'];
  workspaceId?: string;
  workspaceSlug?: string | null;
  workspaceStrategy?: string | null;
  returnPath?: string;
  message?: string;
  workspaceSurface?: boolean;
  hideTopBrand?: boolean;
}) {
  const signupHref = (() => {
    if (workspaceSurface && workspaceId && workspaceSlug) {
      return buildWorkspaceSignupPath({
        workspaceId,
        intent,
        returnPath,
        strategy: workspaceStrategy,
        slug: workspaceSlug,
      });
    }

    const search = new URLSearchParams();

    if (intent) {
      search.set('intent', intent);
    }

    if (entry) {
      search.set('entry', entry);
    }

    if (workspaceId) {
      search.set('workspaceId', workspaceId);
    }

    if (returnPath) {
      search.set('returnTo', returnPath);
    }

    return `/signup?${search.toString()}`;
  })();

  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: '',
      intent,
    },
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cardClassName = workspaceSurface
    ? 'border border-[var(--workspace-accent-border-light)] bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
    : '';
  const primaryButtonClassName = workspaceSurface
    ? 'w-full bg-[var(--workspace-primary)] text-[var(--workspace-primary-foreground)] hover:opacity-95'
    : 'w-full';
  const spinnerClassName = workspaceSurface
    ? 'w-full bg-[var(--workspace-primary)] text-[var(--workspace-primary-foreground)] hover:opacity-95'
    : 'w-full';
  const secondaryButtonClassName = workspaceSurface
    ? 'mb-4 w-full border-[var(--workspace-accent-border-light)] bg-white/85 hover:bg-[var(--workspace-accent-soft-light)] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
    : 'mb-4 w-full';
  const separatorClassName = workspaceSurface
    ? 'my-2 text-slate-500 dark:text-slate-400'
    : 'my-2';
  const messageClassName = workspaceSurface
    ? 'rounded-xl border border-[var(--workspace-accent-border-light)] bg-[var(--workspace-accent-soft-light)] p-3 dark:border-white/10 dark:bg-white/6'
    : 'rounded-lg border border-amber-300 bg-amber-100/70 p-2';
  const errorClassName = workspaceSurface
    ? 'rounded-xl border border-red-200 bg-red-50/90 p-3 dark:border-red-400/30 dark:bg-red-500/10'
    : 'rounded-lg border border-red-400 bg-red-200/50 p-2';

  const onSubmit = async (data: LoginFormInput) => {
    setLoading(true);
    setFormError(null);

    try {
      const formData = new FormData();

      if (entry) {
        formData.append('entry', entry);
      }

      if (workspaceId) {
        formData.append('workspaceId', workspaceId);
      }

      if (returnPath) {
        formData.append('returnPath', returnPath);
      }

      Object.entries(data).forEach(([k, v]) => {
        formData.append(k, String(v));
      });

      await loginAction(formData);
    } catch (err: unknown) {
      if (isNextRedirectError(err)) {
        throw err;
      }

      setLoading(false);

      const error = err as { details?: unknown; message?: string } | undefined;
      const details = error?.details;

      if (details && typeof details === 'object' && !Array.isArray(details)) {
        let mapped = false;

        for (const [field, message] of Object.entries(details)) {
          if (typeof message === 'string') {
            mapped = true;

            form.setError(field as keyof LoginFormInput, {
              message,
            });
          }
        }

        if (mapped) return;
      }

      setFormError(error?.message || 'Something went wrong');
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className={cardClassName}>
        <CardHeader>
          {!hideTopBrand ? (
            <>
              <div className="mx-auto pb-2">
                <Logo />
              </div>

              <FieldSeparator />
            </>
          ) : null}

          <CardTitle className="mt-2 text-sm font-medium md:text-lg">
            Login to your account
          </CardTitle>

          <CardDescription className="text-xs md:text-sm">
            Enter your email or phone number to receive a login OTP
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Field>
            <GoogleButton
              message="Continue with Google"
              size="default"
              className={secondaryButtonClassName}
              onClick={async () => {
                await googleAuthAction();
              }}
            />
          </Field>

          <FieldSeparator className={separatorClassName}>
            Or continue with
          </FieldSeparator>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldSet>
              <FieldGroup>
                {message ? (
                  <Field className={messageClassName}>
                    <FieldDescription className="text-center text-slate-700 dark:text-slate-200">
                      {message}
                    </FieldDescription>
                  </Field>
                ) : null}

                <Field>
                  <FieldLabel>Email or Phone Number</FieldLabel>

                  <FieldContent>
                    <Input
                      placeholder="you@example.com or 9876543210"
                      {...form.register('identifier')}
                    />
                  </FieldContent>

                  <FieldError>
                    {form.formState.errors.identifier?.message}
                  </FieldError>
                </Field>

                {formError ? (
                  <Field className={errorClassName}>
                    <FieldError className="text-center capitalize">
                      {formError}
                    </FieldError>
                  </Field>
                ) : null}

                <Field>
                  {loading ? (
                    <SpinnerButton
                      message="Sending OTP..."
                      className={spinnerClassName}
                    />
                  ) : (
                    <Button type="submit" className={primaryButtonClassName}>
                      Continue
                    </Button>
                  )}
                </Field>

                <Field>
                  <FieldDescription className="text-center">
                    New here?{' '}
                    <Link
                      href={signupHref}
                      className={cn(
                        workspaceSurface &&
                          'font-medium text-[var(--workspace-primary)]',
                      )}
                    >
                      Create account
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
