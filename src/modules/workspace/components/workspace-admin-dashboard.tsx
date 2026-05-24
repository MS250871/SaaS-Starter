'use client';

import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  AlertCircleIcon,
  CopyIcon,
  PaletteIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Badge } from '@/components/ui/badge';
import { createWorkspaceInviteAction } from '@/modules/workspace/actions/create-workspace-invite.action';
import { removeWorkspaceMemberAction } from '@/modules/workspace/actions/remove-workspace-member.action';
import { updateWorkspaceThemeAction } from '@/modules/workspace/actions/update-workspace-theme.action';
import { defaultWorkspaceTheme } from '@/modules/workspace/defaults';
import {
  createWorkspaceInviteFormSchema,
  type CreateWorkspaceInviteFormInput,
  workspaceThemeFormSchema,
  type WorkspaceThemeFormInput,
} from '@/modules/workspace/schema';
import {
  buildWorkspaceThemeStyle,
  getContrastForeground,
  getWorkspaceFontFamily,
  type WorkspaceThemeSettings,
  workspaceFontGroups,
  workspaceRadiusOptions,
} from '@/modules/workspace/theme';

export type DebugActorContext = {
  sessionId?: string;
  identityId?: string;
  customerId?: string;
  workspaceId?: string;
  membershipId?: string;
  workspaceRole?: string;
  platformRole?: string;
  platformRoles?: string[];
  permissions: string[];
};

export type TeamMember = {
  id: string;
  identityId: string;
  role: string;
  roleKey: string;
  roleDefinitionId: string;
  roleSystemKey?: string | null;
  roleRank?: number | null;
  name: string;
  email: string | null;
  createdAt: string;
};

export type DashboardInvite = {
  id: string;
  email: string;
  role: string;
  roleName: string;
  roleDefinitionId: string;
  roleSystemKey?: string | null;
  roleRank?: number | null;
  status: string;
  token: string;
  signupPath: string;
  expiresAt: string | null;
  createdAt: string;
};

export type WorkspaceAssignableRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  roleSystemKey: string | null;
  roleRank: number | null;
};

export type WorkspaceSummary = {
  name: string;
  slug: string;
  primaryDomain?: string | null;
  memberCount: number;
  pendingInviteCount: number;
  customerCount: number;
  domainCount: number;
  apiKeyCount: number;
  unreadNotificationCount: number;
};

function formatInvitePath(path: string) {
  if (typeof window === 'undefined') {
    return path;
  }

  return `${window.location.origin}${path}`;
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="workspace-info-card border bg-background/85">
      <CardHeader className="gap-2">
        <p className="workspace-info-label text-sm font-medium">{label}</p>
        <CardTitle className="workspace-info-value text-2xl font-semibold">
          {value}
        </CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function WorkspaceOverviewPanel({
  workspace,
  actor,
  requestContext,
}: {
  workspace: WorkspaceSummary;
  actor: DebugActorContext;
  requestContext: unknown;
}) {
  const [showAllPermissions, setShowAllPermissions] = useState(false);
  const visiblePermissions = actor.permissions.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Workspace"
          value={workspace.name}
          detail={`Slug: ${workspace.slug}`}
        />
        <StatCard
          label="Members"
          value={workspace.memberCount}
          detail="Active memberships attached to this workspace."
        />
        <StatCard
          label="Pending Invites"
          value={workspace.pendingInviteCount}
          detail="Outstanding invites waiting to be accepted."
        />
        <StatCard
          label="Permissions"
          value={actor.permissions.length}
          detail="The sidebar adapts directly from this actor permission set."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Actor Context</CardTitle>
            <CardDescription>
              A compact snapshot of the current actor with an expandable
              permissions list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="workspace-info-card rounded-2xl border p-4">
                <p className="workspace-info-label text-xs uppercase tracking-[0.2em]">
                  Session
                </p>
                <p className="workspace-info-value mt-2 text-sm font-medium">
                  {actor.sessionId?.slice(0, 12) ?? 'Missing'}
                </p>
              </div>
              <div className="workspace-info-card rounded-2xl border p-4">
                <p className="workspace-info-label text-xs uppercase tracking-[0.2em]">
                  Identity
                </p>
                <p className="workspace-info-value mt-2 text-sm font-medium">
                  {actor.identityId?.slice(0, 12) ?? 'Missing'}
                </p>
              </div>
              <div className="workspace-info-card rounded-2xl border p-4">
                <p className="workspace-info-label text-xs uppercase tracking-[0.2em]">
                  Workspace Role
                </p>
                <p className="workspace-info-value mt-2 text-sm font-medium">
                  {actor.workspaceRole ?? 'Unknown'}
                </p>
              </div>
              <div className="workspace-info-card rounded-2xl border p-4">
                <p className="workspace-info-label text-xs uppercase tracking-[0.2em]">
                  Membership
                </p>
                <p className="workspace-info-value mt-2 text-sm font-medium">
                  {actor.membershipId?.slice(0, 12) ?? 'Missing'}
                </p>
              </div>
            </div>

            <div className="workspace-info-card rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="workspace-info-label text-sm font-medium">
                    Permissions
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Showing the first {Math.min(visiblePermissions.length, 5)}{' '}
                    of {actor.permissions.length}.
                  </p>
                </div>
                {actor.permissions.length > 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllPermissions((current) => !current)}
                  >
                    {showAllPermissions ? 'Show less' : 'Show all'}
                  </Button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(showAllPermissions
                  ? actor.permissions
                  : visiblePermissions
                ).map((permission) => (
                  <Badge key={permission} variant="secondary">
                    {permission}
                  </Badge>
                ))}
                {!showAllPermissions && actor.permissions.length > 5 && (
                  <Badge variant="outline">...</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Request Context</CardTitle>
            <CardDescription>
              The middleware request payload that shaped this admin surface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[28rem] overflow-x-auto rounded-2xl bg-muted/20 p-4 text-xs leading-6">
              {JSON.stringify(requestContext, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export function WorkspaceTeamPanel({
  members,
  initialInvites,
  assignableRoles,
  canInvite,
  canRemoveMembers,
  actorMembershipId,
}: {
  members: TeamMember[];
  initialInvites: DashboardInvite[];
  assignableRoles: WorkspaceAssignableRole[];
  canInvite: boolean;
  canRemoveMembers: boolean;
  actorMembershipId?: string;
}) {
  const [isInvitePending, startInviteTransition] = useTransition();
  const [isRemovePending, startRemoveTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeMessage, setRemoveMessage] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<
    string | null
  >(null);
  const [teamMembers, setTeamMembers] = useState(members);
  const [invites, setInvites] = useState(initialInvites);

  const form = useForm<CreateWorkspaceInviteFormInput>({
    resolver: zodResolver(createWorkspaceInviteFormSchema),
    defaultValues: {
      email: '',
      roleKey: assignableRoles[0]?.key ?? '',
    },
  });

  const onInviteSubmit = (data: CreateWorkspaceInviteFormInput) => {
    setFormMessage(null);
    setFormError(null);

    startInviteTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const response = await createWorkspaceInviteAction(formData);

      if (!response.success) {
        setFormError(response.error.message);
        return;
      }

      setFormMessage(response.data.successMessage);
      setInvites((current) => {
        const next = current.filter(
          (invite) => invite.id !== response.data.invite.id,
        );
        return [response.data.invite, ...next];
      });
      form.reset({
        email: '',
        roleKey: assignableRoles[0]?.key ?? '',
      });
    });
  };

  const handleRemoveMember = (membershipId: string) => {
    setRemoveError(null);
    setRemoveMessage(null);
    setRemovingMembershipId(membershipId);

    startRemoveTransition(async () => {
      const formData = new FormData();
      formData.append('membershipId', membershipId);

      const response = await removeWorkspaceMemberAction(formData);

      if (!response.success) {
        setRemoveError(response.error.message);
        setRemovingMembershipId(null);
        return;
      }

      setTeamMembers((current) =>
        current.filter((member) => member.id !== response.data.membershipId),
      );
      setRemoveMessage(response.data.successMessage);
      setRemovingMembershipId(null);
    });
  };

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 text-accent" />
            <CardTitle>Team</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {removeMessage && (
            <Alert>
              <AlertTitle>Member removed</AlertTitle>
              <AlertDescription>{removeMessage}</AlertDescription>
            </Alert>
          )}

          {removeError && (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Unable to remove member</AlertTitle>
              <AlertDescription>{removeError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {teamMembers.map((member) => {
              const isCurrentMember = member.id === actorMembershipId;
              const isRemoving =
                isRemovePending && removingMembershipId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/15 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                      </p>
                      <Badge variant="outline">{member.role}</Badge>
                      {isCurrentMember && (
                        <Badge variant="secondary">You</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {member.email ?? 'No email available'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canRemoveMembers && !isCurrentMember && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRemoving}
                          >
                            <Trash2Icon className="size-4" />
                            {isRemoving ? 'Removing...' : 'Remove'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {member.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will deactivate the workspace membership and
                              revoke active access for{' '}
                              {member.email ?? member.name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              Remove member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Invite New Member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={form.handleSubmit(onInviteSubmit)}>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <FieldContent>
                    <Input
                      type="email"
                      placeholder="teammate@example.com"
                      disabled={!canInvite || isInvitePending}
                      {...form.register('email')}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.email?.message}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel>Role</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="roleKey"
                      render={({ field }) => (
                        <Select
                          disabled={
                            !canInvite ||
                            isInvitePending ||
                            assignableRoles.length === 0
                          }
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((role) => (
                              <SelectItem key={role.id} value={role.key}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.roleKey?.message}
                  </FieldError>
                </Field>
              </div>

              {!canInvite && (
                <Field>
                  <FieldDescription>
                    Inviting teammates requires the `workspaceInvite.create`
                    permission.
                  </FieldDescription>
                </Field>
              )}

              {canInvite && assignableRoles.length === 0 && (
                <Field>
                  <FieldDescription>
                    No assignable workspace roles are active yet. Add or enable
                    a workspace role definition before sending invites.
                  </FieldDescription>
                </Field>
              )}

              {formMessage && (
                <Alert>
                  <AlertTitle>Invite created</AlertTitle>
                  <AlertDescription>{formMessage}</AlertDescription>
                </Alert>
              )}

              {formError && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Unable to create invite</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Field>
                <div className="flex">
                  {isInvitePending ? (
                    <SpinnerButton
                      className="w-auto"
                      message="Creating invite..."
                    />
                  ) : (
                    <Button
                      type="submit"
                      disabled={!canInvite || assignableRoles.length === 0}
                    >
                      Invite Member
                    </Button>
                  )}
                </div>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Invited Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invites.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No invited members are waiting to accept right now.
            </div>
          ) : (
            invites.map((invite) => {
              const signupPath = invite.signupPath;

              return (
                <div
                  key={invite.id}
                  className="rounded-xl border border-border/70 bg-muted/15 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {invite.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{invite.roleName}</Badge>
                        <Badge variant="outline">Invited</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Invited on {new Date(invite.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          formatInvitePath(signupPath),
                        );
                      }}
                    >
                      <CopyIcon className="size-4" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function WorkspaceThemePanel({
  initialTheme,
  canManageTheme,
}: {
  initialTheme: WorkspaceThemeSettings;
  canManageTheme: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const defaultThemeValues: WorkspaceThemeFormInput = {
    primaryColor: defaultWorkspaceTheme.brand.primary,
    accentColor: defaultWorkspaceTheme.brand.accent,
    headingFont: defaultWorkspaceTheme.typography.headingFont,
    bodyFont: defaultWorkspaceTheme.typography.bodyFont,
    radius: defaultWorkspaceTheme.shape.radius,
  };

  const form = useForm<WorkspaceThemeFormInput>({
    resolver: zodResolver(workspaceThemeFormSchema),
    defaultValues: {
      primaryColor: initialTheme.brand.primary,
      accentColor: initialTheme.brand.accent,
      headingFont: initialTheme.typography.headingFont,
      bodyFont: initialTheme.typography.bodyFont,
      radius: initialTheme.shape.radius,
    },
  });

  const primaryColor = useWatch({
    control: form.control,
    name: 'primaryColor',
  });
  const accentColor = useWatch({
    control: form.control,
    name: 'accentColor',
  });
  const headingFont = useWatch({
    control: form.control,
    name: 'headingFont',
  });
  const bodyFont = useWatch({
    control: form.control,
    name: 'bodyFont',
  });
  const radius = useWatch({
    control: form.control,
    name: 'radius',
  });
  const previewThemeStyle = buildWorkspaceThemeStyle({
    brand: {
      primary: primaryColor,
      accent: accentColor,
    },
    typography: {
      headingFont,
      bodyFont,
    },
    shape: {
      radius,
    },
  });
  const primaryForeground = getContrastForeground(primaryColor);
  const accentForeground = getContrastForeground(accentColor);

  const onSubmit = (data: WorkspaceThemeFormInput) => {
    setFormMessage(null);
    setFormError(null);

    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const response = await updateWorkspaceThemeAction(formData);

      if (!response.success) {
        setFormError(response.error.message);
        return;
      }

      setFormMessage(
        'Theme updated. The workspace surface refreshes immediately and the same theme will persist on future logins.',
      );
      router.refresh();
    });
  };

  const handleResetToDefault = () => {
    setFormMessage(null);
    setFormError(null);

    form.reset(defaultThemeValues);

    startTransition(async () => {
      const formData = new FormData();
      Object.entries(defaultThemeValues).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const response = await updateWorkspaceThemeAction(formData);

      if (!response.success) {
        setFormError(response.error.message);
        return;
      }

      setFormMessage(
        'Theme reverted to the workspace default and will persist on future logins.',
      );
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex items-center gap-2">
            <PaletteIcon className="size-4 text-accent" />
            <CardTitle>Theme</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <div className="grid gap-2 md:grid-cols-[8rem_minmax(0,1fr)] md:items-center">
                    <FieldLabel className="mb-0">Primary Color</FieldLabel>
                    <FieldContent className="flex flex-row items-center gap-3">
                      <Input
                        type="color"
                        className="h-10 w-14 shrink-0 p-1"
                        value={primaryColor}
                        disabled={!canManageTheme || isPending}
                        onChange={(event) => {
                          form.setValue('primaryColor', event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                      <Input
                        className="min-w-0 flex-1"
                        value={primaryColor}
                        disabled={!canManageTheme || isPending}
                        onChange={(event) => {
                          form.setValue('primaryColor', event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                    </FieldContent>
                  </div>
                  <FieldError>
                    {form.formState.errors.primaryColor?.message}
                  </FieldError>
                </Field>

                <Field>
                  <div className="grid gap-2 md:grid-cols-[8rem_minmax(0,1fr)] md:items-center">
                    <FieldLabel className="mb-0">Accent Color</FieldLabel>
                    <FieldContent className="flex flex-row items-center gap-3">
                      <Input
                        type="color"
                        className="h-10 w-14 shrink-0 p-1"
                        value={accentColor}
                        disabled={!canManageTheme || isPending}
                        onChange={(event) => {
                          form.setValue('accentColor', event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                      <Input
                        className="min-w-0 flex-1"
                        value={accentColor}
                        disabled={!canManageTheme || isPending}
                        onChange={(event) => {
                          form.setValue('accentColor', event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                    </FieldContent>
                  </div>
                  <FieldError>
                    {form.formState.errors.accentColor?.message}
                  </FieldError>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field>
                  <FieldLabel>Heading Font</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="headingFont"
                      render={({ field }) => (
                        <Select
                          disabled={!canManageTheme || isPending}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select heading font" />
                          </SelectTrigger>
                          <SelectContent>
                            {workspaceFontGroups.map((group) => (
                              <SelectGroup key={group.label}>
                                <SelectLabel>{group.label}</SelectLabel>
                                {group.options.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    <span
                                      style={{
                                        fontFamily:
                                          getWorkspaceFontFamily(option),
                                      }}
                                    >
                                      {option}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.headingFont?.message}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel>Body Font</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="bodyFont"
                      render={({ field }) => (
                        <Select
                          disabled={!canManageTheme || isPending}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select body font" />
                          </SelectTrigger>
                          <SelectContent>
                            {workspaceFontGroups.map((group) => (
                              <SelectGroup key={group.label}>
                                <SelectLabel>{group.label}</SelectLabel>
                                {group.options.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    <span
                                      style={{
                                        fontFamily:
                                          getWorkspaceFontFamily(option),
                                      }}
                                    >
                                      {option}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.bodyFont?.message}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel>Radius</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="radius"
                      render={({ field }) => (
                        <Select
                          disabled={!canManageTheme || isPending}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select radius" />
                          </SelectTrigger>
                          <SelectContent>
                            {workspaceRadiusOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.radius?.message}
                  </FieldError>
                </Field>
              </div>

              {!canManageTheme && (
                <Field>
                  <FieldDescription>
                    Updating the theme requires the `workspaceSettings.update`
                    permission.
                  </FieldDescription>
                </Field>
              )}

              {formMessage && (
                <Alert>
                  <AlertTitle>Theme saved</AlertTitle>
                  <AlertDescription>{formMessage}</AlertDescription>
                </Alert>
              )}

              {formError && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Unable to update theme</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Field>
                {isPending ? (
                  <SpinnerButton message="Saving theme..." />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" disabled={!canManageTheme}>
                      Save Theme
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canManageTheme}
                      onClick={handleResetToDefault}
                    >
                      Revert to Default
                    </Button>
                  </div>
                )}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Theme Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="workspace-surface overflow-hidden rounded-[calc(var(--radius)+0.5rem)] border shadow-sm"
            style={{
              ...previewThemeStyle,
              borderColor: `${primaryColor}40`,
            }}
          >
            <div className="grid min-h-[24rem] overflow-hidden lg:grid-cols-[16rem_1fr] xl:grid-cols-[18rem_1fr]">
              <aside className="border-r border-sidebar-border/70 bg-sidebar px-4 py-5 text-sidebar-foreground">
                <div className="rounded-[calc(var(--radius)+0.15rem)] border border-sidebar-border/70 bg-background/80 p-3 text-sidebar-foreground">
                  <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">
                    Workspace
                  </p>
                  <h3
                    data-workspace-heading
                    className="mt-2 text-base font-semibold"
                  >
                    {headingFont}
                  </h3>
                  <p className="mt-2 text-sm/6 opacity-85">
                    Sidebar labels and helper copy switch with the paragraph
                    font.
                  </p>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {['Overview', 'Team', 'Domains', 'Theme'].map(
                    (item, index) => (
                      <div
                        key={item}
                        className="rounded-[calc(var(--radius)-0.1rem)] px-3 py-2"
                        style={
                          index === 3
                            ? {
                                backgroundColor: 'var(--sidebar-accent)',
                                color: 'var(--sidebar-primary)',
                              }
                            : undefined
                        }
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>
              </aside>

              <div
                className="bg-background px-5 py-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="border-0"
                    style={{
                      backgroundColor: primaryColor,
                      color: primaryForeground,
                    }}
                  >
                    Primary
                  </Badge>
                  <Badge
                    className="border-0"
                    style={{
                      backgroundColor: accentColor,
                      color: accentForeground,
                    }}
                  >
                    Accent
                  </Badge>
                </div>

                <h3
                  data-workspace-heading
                  className="mt-5 text-xl font-semibold tracking-tight"
                >
                  Fonts now preview in the actual shell
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Headings use {headingFont}. Paragraphs, nav labels, and helper
                  copy use {bodyFont}. Rounded corners are set to {radius}.
                </p>

                <div className="mt-5 grid gap-3 grid-cols-1">
                  <div className="rounded-[calc(var(--radius)+0.1rem)] border border-border/70 bg-card/90 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Heading Sample
                    </p>
                    <h4
                      data-workspace-heading
                      className="mt-3 text-lg font-semibold"
                    >
                      Launch a sharper learning workspace
                    </h4>
                  </div>
                  <div className="rounded-[calc(var(--radius)+0.1rem)] border border-border/70 bg-card/90 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Body Sample
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      This preview uses the selected paragraph font so the
                      impact is visible before you save the workspace theme.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function WorkspaceModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 p-8 text-sm text-muted-foreground">
            We can build this module next in the same workspace shell.
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
