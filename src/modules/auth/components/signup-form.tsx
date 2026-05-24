'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupFormSchema, type SignupFormInput } from '@/modules/auth/schema';
import { signupAction } from '@/modules/auth/actions/signup.action';
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
import { buildWorkspaceLoginPath } from '@/modules/workspace/routing';

export function SignupForm({
  intent,
  invite,
  entry,
  workspaceId,
  workspaceSlug,
  workspaceStrategy,
  planKey,
  planName,
  returnPath,
  message,
  className,
  workspaceSurface = false,
  hideTopBrand = false,
}: {
  intent: AuthCookies['intent'];
  invite?: string;
  entry: AuthCookies['entry'];
  workspaceId?: string;
  workspaceSlug?: string | null;
  workspaceStrategy?: string | null;
  planKey?: string;
  planName?: string;
  returnPath?: string;
  message?: string;
  className?: string;
  workspaceSurface?: boolean;
  hideTopBrand?: boolean;
}) {
  const loginHref = (() => {
    if (workspaceSurface && workspaceId && workspaceSlug) {
      return buildWorkspaceLoginPath({
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

    return `/login?${search.toString()}`;
  })();

  const form = useForm<SignupFormInput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
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
    : '';

  const onSubmit = async (data: SignupFormInput) => {
    setLoading(true);
    setFormError(null);

    try {
      const formData = new FormData();

      if (invite) {
        formData.append('inviteToken', invite);
      }

      const safeEntry =
        entry === 'workspace' || entry === 'platform' ? entry : 'platform';
      formData.append('entry', safeEntry);

      if (workspaceId) {
        formData.append('workspaceId', workspaceId);
      }

      if (planKey) {
        formData.append('planKey', planKey);
      }

      if (planName) {
        formData.append('planName', planName);
      }

      if (returnPath) {
        formData.append('returnPath', returnPath);
      }

      Object.entries(data).forEach(([k, v]) => {
        formData.append(k, String(v));
      });

      await signupAction(formData);
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

            form.setError(field as keyof SignupFormInput, {
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
            {invite ? 'Accept your workspace invite' : 'Create your account'}
          </CardTitle>

          <CardDescription className="text-xs md:text-sm">
            {invite
              ? 'Create or confirm your account to accept this workspace invite. We will verify your email first, then your phone.'
              : planName
                ? `You are signing up for the ${planName} plan. We will verify your email first, then your phone.`
                : 'We will verify your email first, then your phone.'}
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
            <FieldSet className="gap-3">
              <FieldGroup className="mt-3 gap-3">
                {message ? (
                  <Field className={messageClassName}>
                    <FieldDescription className="text-center text-slate-700 dark:text-slate-200">
                      {message}
                    </FieldDescription>
                  </Field>
                ) : null}

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <Field>
                    <FieldLabel>First Name</FieldLabel>
                    <FieldContent>
                      <Input {...form.register('firstName')} />
                    </FieldContent>
                    <FieldError className="text-xs">
                      {form.formState.errors.firstName?.message}
                    </FieldError>
                  </Field>

                  <Field>
                    <FieldLabel>Last Name</FieldLabel>
                    <FieldContent>
                      <Input {...form.register('lastName')} />
                    </FieldContent>
                    <FieldError className="text-xs">
                      {form.formState.errors.lastName?.message}
                    </FieldError>
                  </Field>
                </div>

                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <FieldContent>
                    <Input type="email" {...form.register('email')} />
                  </FieldContent>
                  <FieldError className="text-xs">
                    {form.formState.errors.email?.message}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel>Phone</FieldLabel>
                  <FieldContent>
                    <Input {...form.register('phone')} />
                  </FieldContent>
                  <FieldError className="text-xs">
                    {form.formState.errors.phone?.message}
                  </FieldError>
                </Field>

                {formError ? (
                  <Field className={errorClassName}>
                    <FieldError className="text-center">{formError}</FieldError>
                  </Field>
                ) : null}

                <Field>
                  {loading ? (
                    <SpinnerButton
                      message="Creating your account..."
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
                    {invite ? (
                      'Use this invite flow even if you already have an account.'
                    ) : (
                      <>
                        Already have an account?{' '}
                        <Link
                          href={loginHref}
                          className={cn(
                            workspaceSurface &&
                              'font-medium text-[var(--workspace-primary)]',
                          )}
                        >
                          Login here
                        </Link>
                      </>
                    )}
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
