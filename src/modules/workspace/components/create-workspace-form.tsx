'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Logo } from '@/components/layout/logo';
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
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { isNextRedirectError } from '@/lib/http/is-next-redirect-error';
import { cn } from '@/lib/utils';
import { createWorkspaceAction } from '@/modules/workspace/actions/create-workspace.action';
import {
  createWorkspaceFormSchema,
  slugifyWorkspaceName,
  type CreateWorkspaceFormInput,
} from '@/modules/workspace/schema';

export function CreateWorkspaceForm({
  className,
  intent = 'free',
  rootDomain = 'platform.localhost',
  brandedSurface = false,
  hideTopBrand = false,
}: {
  className?: string;
  intent?: 'free' | 'paid';
  rootDomain?: string;
  brandedSurface?: boolean;
  hideTopBrand?: boolean;
}) {
  const form = useForm<CreateWorkspaceFormInput>({
    resolver: zodResolver(createWorkspaceFormSchema),
    defaultValues: {
      workspaceName: '',
    },
  });

  const workspaceName =
    useWatch({
      control: form.control,
      name: 'workspaceName',
    }) ?? '';

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const cardClassName = brandedSurface
    ? 'border border-[var(--workspace-accent-border-light)] bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
    : '';
  const primaryButtonClassName = brandedSurface
    ? 'w-full bg-[var(--workspace-primary)] text-[var(--workspace-primary-foreground)] hover:opacity-95'
    : 'w-full';
  const spinnerClassName = brandedSurface
    ? 'w-full bg-[var(--workspace-primary)] text-[var(--workspace-primary-foreground)] hover:opacity-95'
    : 'w-full';
  const errorClassName = brandedSurface
    ? 'rounded-xl border border-red-200 bg-red-50/90 p-3 dark:border-red-400/30 dark:bg-red-500/10'
    : 'rounded-lg border border-red-400 bg-red-200/50 p-2';

  const workspaceSlug = slugifyWorkspaceName(workspaceName);
  const workspaceUrl = workspaceSlug
    ? intent === 'paid'
      ? `${workspaceSlug}.${rootDomain}`
      : `${rootDomain}/${workspaceSlug}`
    : intent === 'paid'
      ? `your-workspace-slug.${rootDomain}`
      : `${rootDomain}/your-workspace-slug`;

  const onSubmit = async (data: CreateWorkspaceFormInput) => {
    setLoading(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append('workspaceName', data.workspaceName);

      await createWorkspaceAction(formData);
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

            form.setError(field as keyof CreateWorkspaceFormInput, {
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
      <Card className={cn('pt-0', cardClassName)}>
        <CardHeader>
          {!hideTopBrand ? (
            <>
              <div className="mx-auto pt-6 pb-2">
                <Logo />
              </div>

              <FieldSeparator />
            </>
          ) : null}

          <CardTitle className="mt-2 text-center text-sm font-medium md:text-lg">
            Welcome, create your workspace
          </CardTitle>

          <CardDescription className="text-xs md:text-sm text-center">
            Give your team a home base. Start with a workspace name and we&apos;ll
            generate a clean slug for you.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldSet>
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel>Workspace Name</FieldLabel>
                  <FieldContent>
                    <Input
                      autoFocus
                      placeholder="Acme Studio"
                      {...form.register('workspaceName')}
                    />
                  </FieldContent>
                  <FieldDescription>
                    This is the name your team will see across the app.
                  </FieldDescription>
                  <FieldError>
                    {form.formState.errors.workspaceName?.message}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel>Workspace Slug</FieldLabel>
                  <FieldContent>
                    <Input
                      readOnly
                      value={workspaceSlug || 'your-workspace-slug'}
                      className="bg-muted/30 text-muted-foreground"
                    />
                  </FieldContent>
                  <FieldDescription>
                    Your workspace URL will look like{' '}
                    <span className="font-medium text-foreground" aria-live="polite">
                      {workspaceUrl}
                    </span>
                    {intent === 'paid'
                      ? '. You can connect a custom domain after DNS verification.'
                      : '.'}
                  </FieldDescription>
                  {workspaceName.trim().length > 0 && !workspaceSlug && (
                    <FieldError>Enter a workspace name to generate a slug.</FieldError>
                  )}
                </Field>

                {formError && (
                  <Field className={errorClassName}>
                    <FieldError className="text-center">{formError}</FieldError>
                  </Field>
                )}

                <Field>
                  {loading ? (
                    <SpinnerButton
                      message="Creating workspace..."
                      size="default"
                      className={spinnerClassName}
                    />
                  ) : (
                    <Button
                      type="submit"
                      className={primaryButtonClassName}
                      disabled={!workspaceSlug}
                    >
                      Create workspace
                    </Button>
                  )}
                </Field>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
