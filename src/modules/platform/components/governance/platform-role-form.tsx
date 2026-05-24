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
  createRoleAdminAction,
  updateRoleAdminAction,
} from '@/modules/roles/actions/platform-role-admin.actions';

type RoleEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/roles/server/platform-governance-roles-page-data').getPlatformGovernanceRoleEditorData
  >
>;

export function PlatformRoleForm({
  mode,
  role,
  permissions,
  assignedPermissionIds,
}: RoleEditorData & {
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectedPermissionIds = new Set(assignedPermissionIds);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response =
        mode === 'create'
          ? await createRoleAdminAction(formData)
          : await updateRoleAdminAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      router.push(`/platform/governance/roles/${response.data.roleDefinitionId}`);
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{mode === 'create' ? 'Create role failed' : 'Update role failed'}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Role Profile</CardTitle>
          <CardDescription>
            Define the role identity, assignment behavior, and direct permission grants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-6">
              {mode === 'edit' ? (
                <input
                  type="hidden"
                  name="roleDefinitionId"
                  value={role?.id ?? ''}
                />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <FieldContent>
                    <Input name="name" defaultValue={role?.name ?? ''} disabled={isPending} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Key</FieldLabel>
                  <FieldContent>
                    <Input name="key" defaultValue={role?.key ?? ''} disabled={isPending} />
                  </FieldContent>
                  <FieldError>Use a stable lowercase key like `platform-staff` or `workspace-reviewer`.</FieldError>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Scope</FieldLabel>
                  <FieldContent>
                    <select
                      name="scope"
                      defaultValue={role?.scope ?? 'PLATFORM'}
                      disabled={isPending || !!role?.isSystem}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="PLATFORM">Platform</option>
                      <option value="WORKSPACE">Workspace</option>
                    </select>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Hierarchy Rank</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={0}
                      name="hierarchyRank"
                      defaultValue={role?.hierarchyRank ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <FieldContent>
                  <Textarea
                    name="description"
                    defaultValue={role?.description ?? ''}
                    disabled={isPending}
                    placeholder="What kind of operator or member should receive this role?"
                  />
                </FieldContent>
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={role?.isActive ?? true}
                    disabled={isPending}
                  />
                  Active
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="isAssignable"
                    defaultChecked={role?.isAssignable ?? true}
                    disabled={isPending}
                  />
                  Assignable
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="isDefault"
                    defaultChecked={role?.isDefault ?? false}
                    disabled={isPending}
                  />
                  Default role
                </label>
              </div>

              <Card className="border-border/70 bg-muted/10">
                <CardHeader>
                  <CardTitle className="text-base">Direct Permission Grants</CardTitle>
                  <CardDescription>
                    Choose the permission keys this role should resolve before workspace or user-level overrides are applied.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex gap-3 rounded-xl border border-border/70 px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        name="permissionIds"
                        value={permission.id}
                        defaultChecked={selectedPermissionIds.has(permission.id)}
                        disabled={isPending}
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {permission.name ?? permission.key}
                        </p>
                        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {permission.key}
                        </p>
                        <p className="text-xs text-muted-foreground">{permission.entity}</p>
                      </div>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message={mode === 'create' ? 'Creating role...' : 'Saving role...'}
                  />
                ) : (
                  <Button type="submit">
                    {mode === 'create' ? 'Create Role' : 'Save Role'}
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
