'use client';

import { type FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import {
  createPermissionAdminAction,
  updatePermissionAdminAction,
} from '@/modules/permissions/actions/platform-permission-admin.actions';

type PermissionEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/permissions/server/platform-governance-permission-page-data').getPlatformGovernancePermissionEditorData
  >
>;

export function PlatformPermissionForm({
  mode,
  permission,
}: PermissionEditorData & {
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response =
        mode === 'create'
          ? await createPermissionAdminAction(formData)
          : await updatePermissionAdminAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      router.push(`/platform/governance/permissions/${response.data.permissionId}`);
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>
            {mode === 'create' ? 'Create permission failed' : 'Update permission failed'}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Permission Profile</CardTitle>
          <CardDescription>
            Define the canonical permission key that roles, workspace overrides, and user overrides resolve against.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-6">
              {mode === 'edit' ? (
                <input
                  type="hidden"
                  name="permissionId"
                  value={permission?.id ?? ''}
                />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <FieldContent>
                    <Input
                      name="name"
                      defaultValue={permission?.name ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Entity</FieldLabel>
                  <FieldContent>
                    <Input
                      name="entity"
                      defaultValue={permission?.entity ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel>Key</FieldLabel>
                <FieldContent>
                  <Input
                    name="key"
                    defaultValue={permission?.key ?? ''}
                    disabled={isPending}
                  />
                </FieldContent>
                <FieldError>Use a stable lowercase key like `workspace.read` or `platformBilling.refund`.</FieldError>
              </Field>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <FieldContent>
                  <Textarea
                    name="description"
                    defaultValue={permission?.description ?? ''}
                    disabled={isPending}
                    placeholder="What capability does this permission unlock?"
                  />
                </FieldContent>
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={permission?.isActive ?? true}
                  disabled={isPending}
                />
                Active
              </label>

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message={
                      mode === 'create'
                        ? 'Creating permission...'
                        : 'Saving permission...'
                    }
                  />
                ) : (
                  <Button type="submit">
                    {mode === 'create' ? 'Create Permission' : 'Save Permission'}
                  </Button>
                )}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
