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

export function CreateWorkspaceForm({ className }: { className?: string }) {
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

  const workspaceSlug = slugifyWorkspaceName(workspaceName);
  const workspaceUrl = workspaceSlug
    ? `app.skillmaxx.com/${workspaceSlug}`
    : 'app.skillmaxx.com/your-workspace-slug';

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
      <Card className="pt-0">
        <CardHeader>
          <div className="mx-auto pt-6 pb-2">
            <Logo />
          </div>

          <FieldSeparator />

          <CardTitle className="text-sm md:text-lg mt-2 font-medium text-center">
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
                    .
                  </FieldDescription>
                  {workspaceName.trim().length > 0 && !workspaceSlug && (
                    <FieldError>Enter a workspace name to generate a slug.</FieldError>
                  )}
                </Field>

                {formError && (
                  <Field className="rounded-lg border border-red-400 bg-red-200/50 p-2">
                    <FieldError className="text-center">{formError}</FieldError>
                  </Field>
                )}

                <Field>
                  {loading ? (
                    <SpinnerButton
                      message="Creating workspace..."
                      size="default"
                      className="w-full"
                    />
                  ) : (
                    <Button type="submit" className="w-full" disabled={!workspaceSlug}>
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
