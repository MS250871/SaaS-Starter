'use client';

import { type FormEvent, useMemo, useState, useTransition } from 'react';
import { flushSync } from 'react-dom';
import { CopyIcon } from 'lucide-react';
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
import { SpinnerButton } from '@/components/ui/spinner-button';
import { createPlatformInviteAction } from '@/modules/platform/actions/platform-governance-admin.actions';
import type {
  PlatformGovernanceAssignableRole,
  PlatformGovernanceInviteRow,
} from '@/modules/platform/server/platform-governance-team-page-data';

function formatInvitePath(path: string) {
  if (typeof window === 'undefined') {
    return path;
  }

  return `${window.location.origin}${path}`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    dateStyle: 'medium',
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function PlatformGovernanceInvitePanel({
  assignableRoles,
  invites,
  onInviteCreated,
}: {
  assignableRoles: PlatformGovernanceAssignableRole[];
  invites: PlatformGovernanceInviteRow[];
  onInviteCreated: (invite: PlatformGovernanceInviteRow) => void;
}) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [roleKey, setRoleKey] = useState(assignableRoles[0]?.key ?? '');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isPending = isSubmitting || isRefreshing;

  const selectedRole = useMemo(
    () => assignableRoles.find((role) => role.key === roleKey) ?? null,
    [assignableRoles, roleKey],
  );

  const pendingInvites = invites.filter((invite) => invite.isPending);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    setFormError(null);

    const formData = new FormData();
    formData.set('email', email);
    formData.set('roleKey', roleKey);

    setIsSubmitting(true);

    void (async () => {
      const response = await createPlatformInviteAction(formData);

      if (!response.success) {
        setFormError(response.error.message);
        setIsSubmitting(false);
        return;
      }

      setFormMessage(response.data.successMessage);
      flushSync(() => {
        onInviteCreated({
          id: response.data.invite.id,
          email: response.data.invite.email,
          roleName: response.data.invite.roleName,
          roleKey: response.data.invite.roleKey,
          roleSystemKey: response.data.invite.roleSystemKey,
          scopeLabel: 'Platform',
          statusLabel: 'Pending',
          isPending: true,
          invitedByName: 'You',
          signupPath: response.data.invite.signupPath,
          expiresAtLabel: formatDate(response.data.invite.expiresAt),
          createdAtLabel: formatShortDate(response.data.invite.createdAt),
        });
      });
      setEmail('');
      setRoleKey(assignableRoles[0]?.key ?? '');
      setIsSubmitting(false);
      startRefreshTransition(() => {
        router.refresh();
      });
    })();
  };

  return (
    <Card className="border-border/70 bg-background/85">
      <CardHeader>
        <CardTitle>Invite Platform Operator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <Input
                    type="email"
                    name="email"
                    placeholder="operator@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isPending}
                  />
                </FieldContent>
                <FieldError>
                  {email.length === 0 && formError?.includes('email') ? formError : undefined}
                </FieldError>
              </Field>

              <Field>
                <FieldLabel>Role</FieldLabel>
                <FieldContent>
                  <select
                    name="roleKey"
                    value={roleKey}
                    onChange={(event) => setRoleKey(event.target.value)}
                    disabled={isPending || assignableRoles.length === 0}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {assignableRoles.map((role) => (
                      <option key={role.id} value={role.key}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </FieldContent>
                <FieldDescription>
                  {selectedRole?.description ??
                    'Choose which platform role this operator should receive after signup.'}
                </FieldDescription>
              </Field>

              {assignableRoles.length === 0 ? (
                <Field>
                  <FieldDescription>
                    No assignable platform roles are active yet. Create or enable one before sending invites.
                  </FieldDescription>
                </Field>
              ) : null}

              {formMessage ? (
                <Alert>
                  <AlertTitle>Invite ready</AlertTitle>
                  <AlertDescription>{formMessage}</AlertDescription>
                </Alert>
              ) : null}

              {formError ? (
                <Alert variant="destructive">
                  <AlertTitle>Unable to create platform invite</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                {isPending ? (
                  <SpinnerButton className="w-full sm:w-auto" message="Creating invite..." />
                ) : (
                  <Button type="submit" disabled={assignableRoles.length === 0}>
                    Create Invite
                  </Button>
                )}
              </Field>
            </FieldGroup>
          </form>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Shareable invite links</p>
              <p className="text-sm text-muted-foreground">
                Pending invites stay here so you can copy the link again without recreating the operator record.
              </p>
            </div>

            {pendingInvites.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No pending platform invites are waiting to be shared right now.
              </div>
            ) : (
              pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-xl border border-border/70 bg-muted/15 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invite.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {invite.roleName} • expires {invite.expiresAtLabel}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Created {invite.createdAtLabel}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          formatInvitePath(invite.signupPath),
                        );
                      }}
                    >
                      <CopyIcon className="size-4" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
