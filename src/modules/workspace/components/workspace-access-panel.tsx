'use client';

import { useMemo, useState, useTransition } from 'react';
import { KeyRoundIcon, ShieldIcon, UserCogIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateWorkspaceRolePermissionOverrideAction } from '@/modules/permissions/actions/update-workspace-role-permission-override.action';
import { updateWorkspaceUserPermissionOverrideAction } from '@/modules/permissions/actions/update-workspace-user-permission-override.action';
import { revokeWorkspaceUserPermissionOverrideAction } from '@/modules/permissions/actions/revoke-workspace-user-permission-override.action';

type AccessRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  roleSystemKey: string | null;
  roleRank: number | null;
  isAssignable: boolean;
  isDefault: boolean;
  isSystem: boolean;
  basePermissionIds: string[];
  overrideModes: Record<string, 'allow' | 'deny'>;
};

type AccessPermission = {
  id: string;
  key: string;
  name: string | null;
  description: string | null;
};

type AccessPermissionGroup = {
  entity: string;
  permissions: AccessPermission[];
};

type AccessUserOverride = {
  id: string;
  identityId: string;
  permissionId: string;
  permissionKey: string;
  permissionName: string | null;
  effect: 'ALLOW' | 'DENY';
  source: string;
  createdAt: string;
  expiresAt: string | null;
  memberName: string;
  memberEmail: string | null;
  grantedByName: string | null;
};

type AccessMember = {
  membershipId: string;
  identityId: string;
  name: string;
  email: string | null;
  roleName: string;
  roleKey: string;
};

type PendingRoleConfirmation = {
  roleDefinitionId: string;
  roleName: string;
  permissionId: string;
  permissionLabel: string;
  mode: 'inherit' | 'allow' | 'deny';
} | null;

type PendingUserConfirmation = {
  action: 'allow' | 'deny' | 'clear';
  identityId: string;
  memberName: string;
  permissionId: string;
  permissionLabel: string;
  userPermissionId?: string;
} | null;

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="workspace-info-card border bg-background/85">
      <CardHeader className="gap-2">
        <p className="workspace-info-label text-sm font-medium">{label}</p>
        <CardTitle className="workspace-info-value text-2xl font-semibold">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export function WorkspaceAccessPanel({
  roles,
  permissionsByEntity,
  userOverrides: initialUserOverrides,
  members,
  accessSummary,
  canManageAccess,
}: {
  roles: AccessRole[];
  permissionsByEntity: AccessPermissionGroup[];
  userOverrides: AccessUserOverride[];
  members: AccessMember[];
  accessSummary: {
    roleCount: number;
    permissionCount: number;
    roleOverrideCount: number;
    userOverrideCount: number;
  };
  canManageAccess: boolean;
}) {
  const router = useRouter();
  const [isRoleUpdatePending, startRoleUpdateTransition] = useTransition();
  const [isUserUpdatePending, startUserUpdateTransition] = useTransition();
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [pendingRoleConfirmation, setPendingRoleConfirmation] =
    useState<PendingRoleConfirmation>(null);
  const [pendingUserConfirmation, setPendingUserConfirmation] =
    useState<PendingUserConfirmation>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id ?? '');
  const [selectedRoleEntity, setSelectedRoleEntity] = useState<string>(
    permissionsByEntity[0]?.entity ?? '',
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members[0]?.identityId ?? '',
  );
  const [selectedMemberEntity, setSelectedMemberEntity] = useState<string>(
    permissionsByEntity[0]?.entity ?? '',
  );
  const [roleOverrideModes, setRoleOverrideModes] = useState<
    Record<string, Record<string, 'inherit' | 'allow' | 'deny'>>
  >(
    Object.fromEntries(
      roles.map((role) => [
        role.id,
        Object.fromEntries(
          Object.entries(role.overrideModes).map(([permissionId, mode]) => [
            permissionId,
            mode,
          ]),
        ),
      ]),
    ),
  );
  const [userOverrides, setUserOverrides] =
    useState<AccessUserOverride[]>(initialUserOverrides);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;
  const selectedMember =
    members.find((member) => member.identityId === selectedMemberId) ?? null;
  const selectedMemberRole =
    roles.find((role) => role.key === selectedMember?.roleKey) ?? null;
  const selectedRolePermissionGroup =
    permissionsByEntity.find((group) => group.entity === selectedRoleEntity) ??
    permissionsByEntity[0] ??
    null;
  const selectedMemberPermissionGroup =
    permissionsByEntity.find((group) => group.entity === selectedMemberEntity) ??
    permissionsByEntity[0] ??
    null;
  const filteredMemberOverrides = useMemo(() => {
    if (!selectedMemberId) {
      return userOverrides;
    }

    return userOverrides.filter(
      (override) => override.identityId === selectedMemberId,
    );
  }, [selectedMemberId, userOverrides]);
  const selectedMemberOverrideMap = useMemo(
    () =>
      new Map(
        filteredMemberOverrides.map((override) => [override.permissionId, override]),
      ),
    [filteredMemberOverrides],
  );

  const applyRoleOverrideChange = (
    roleDefinitionId: string,
    permissionId: string,
    mode: 'inherit' | 'allow' | 'deny',
  ) => {
    setRoleMessage(null);
    setRoleError(null);

    const previousMode =
      roleOverrideModes[roleDefinitionId]?.[permissionId] ?? 'inherit';

    setRoleOverrideModes((current) => ({
      ...current,
      [roleDefinitionId]: {
        ...(current[roleDefinitionId] ?? {}),
        [permissionId]: mode,
      },
    }));

    startRoleUpdateTransition(async () => {
      const formData = new FormData();
      formData.append('roleDefinitionId', roleDefinitionId);
      formData.append('permissionId', permissionId);
      formData.append('mode', mode);

      const response =
        await updateWorkspaceRolePermissionOverrideAction(formData);

      if (!response.success) {
        setRoleError(response.error.message);
        setRoleOverrideModes((current) => ({
          ...current,
          [roleDefinitionId]: {
            ...(current[roleDefinitionId] ?? {}),
            [permissionId]: previousMode,
          },
        }));
        return;
      }

      setRoleMessage(response.data.successMessage);
      router.refresh();
    });
  };

  const applyUserOverrideChange = (
    permissionId: string,
    effect: 'ALLOW' | 'DENY',
  ) => {
    setUserMessage(null);
    setUserError(null);

    startUserUpdateTransition(async () => {
      const formData = new FormData();
      formData.append('identityId', selectedMemberId);
      formData.append('permissionId', permissionId);
      formData.append('effect', effect);

      const response =
        await updateWorkspaceUserPermissionOverrideAction(formData);

      if (!response.success) {
        setUserError(response.error.message);
        return;
      }

      const permission =
        permissionsByEntity
          .flatMap((group) => group.permissions)
          .find((entry) => entry.id === permissionId) ?? null;
      const member = members.find((entry) => entry.identityId === selectedMemberId);

      setUserOverrides((current) => {
        const next = current.filter(
          (override) =>
            !(
              override.identityId === response.data.identityId &&
              override.permissionId === permissionId
            ),
        );

        return [
          {
            id: response.data.userPermissionId,
            identityId: response.data.identityId,
            permissionId,
            permissionKey: response.data.permissionKey,
            permissionName: permission?.name ?? null,
            effect: response.data.effect,
            source: 'MANUAL',
            createdAt: new Date().toISOString(),
            expiresAt: null,
            memberName: member?.name ?? response.data.memberName,
            memberEmail: member?.email ?? null,
            grantedByName: 'You',
          },
          ...next,
        ];
      });
      setUserMessage(response.data.successMessage);
      router.refresh();
    });
  };

  const applyUserOverrideRevoke = (userPermissionId: string) => {
    setUserMessage(null);
    setUserError(null);

    startUserUpdateTransition(async () => {
      const formData = new FormData();
      formData.append('userPermissionId', userPermissionId);

      const response =
        await revokeWorkspaceUserPermissionOverrideAction(formData);

      if (!response.success) {
        setUserError(response.error.message);
        return;
      }

      setUserOverrides((current) =>
        current.filter((override) => override.id !== userPermissionId),
      );
      setUserMessage(response.data.successMessage);
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Workspace Roles"
          value={accessSummary.roleCount}
        />
        <StatCard
          label="Permission Catalog"
          value={accessSummary.permissionCount}
        />
        <StatCard
          label="Role Overrides"
          value={accessSummary.roleOverrideCount}
        />
        <StatCard
          label="Direct Overrides"
          value={userOverrides.length}
        />
      </div>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldIcon className="size-4 text-accent" />
            <CardTitle>Role Policies</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
            <div className="space-y-3">
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedRole && (
                <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{selectedRole.name}</p>
                    {selectedRole.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    {selectedRole.isSystem && (
                      <Badge variant="outline">System</Badge>
                    )}
                    {!selectedRole.isAssignable && (
                      <Badge variant="outline">Not assignable</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedRole.description ?? 'No description available.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      Key: {selectedRole.key}
                    </Badge>
                    {selectedRole.roleSystemKey && (
                      <Badge variant="outline">
                        System: {selectedRole.roleSystemKey}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Rank: {selectedRole.roleRank ?? 'n/a'}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Choose module
                </p>
                <Select
                  value={selectedRoleEntity}
                  onValueChange={setSelectedRoleEntity}
                >
                  <SelectTrigger className="mt-3 w-full">
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionsByEntity.map((group) => (
                      <SelectItem key={group.entity} value={group.entity}>
                        {group.entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {roleMessage && (
                <Alert>
                  <AlertTitle>Role override updated</AlertTitle>
                  <AlertDescription>{roleMessage}</AlertDescription>
                </Alert>
              )}

              {roleError && (
                <Alert variant="destructive">
                  <AlertTitle>Unable to update role override</AlertTitle>
                  <AlertDescription>{roleError}</AlertDescription>
                </Alert>
              )}

              {selectedRolePermissionGroup && (
                <Card
                  key={selectedRolePermissionGroup.entity}
                  className="border-border/70 bg-background/60"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {selectedRolePermissionGroup.entity}
                    </CardTitle>
                    <CardDescription>
                      Base permissions come from the selected role. Workspace
                      overrides are layered on top.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedRolePermissionGroup.permissions.map((permission) => {
                      const isBaseAllowed = selectedRole
                        ? selectedRole.basePermissionIds.includes(permission.id)
                        : false;
                      const currentMode =
                        (selectedRole &&
                          roleOverrideModes[selectedRole.id]?.[permission.id]) ??
                        'inherit';

                      return (
                        <div
                          key={permission.id}
                          className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {permission.name ?? permission.key}
                              </p>
                              <Badge
                                variant={isBaseAllowed ? 'secondary' : 'outline'}
                              >
                                Base {isBaseAllowed ? 'allowed' : 'hidden'}
                              </Badge>
                              <Badge variant="outline">
                                Current {currentMode}
                              </Badge>
                            </div>
                            <p className="mt-1 break-all text-xs text-muted-foreground">
                              {permission.key}
                            </p>
                            {permission.description && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                currentMode === 'inherit' ? 'secondary' : 'outline'
                              }
                              disabled={
                                !canManageAccess ||
                                isRoleUpdatePending ||
                                !selectedRole ||
                                currentMode === 'inherit'
                              }
                              onClick={() => {
                                if (!selectedRole) return;
                                setPendingRoleConfirmation({
                                  roleDefinitionId: selectedRole.id,
                                  roleName: selectedRole.name,
                                  permissionId: permission.id,
                                  permissionLabel: permission.key,
                                  mode: 'inherit',
                                });
                              }}
                            >
                              Inherit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                currentMode === 'allow' ? 'secondary' : 'outline'
                              }
                              disabled={
                                !canManageAccess ||
                                isRoleUpdatePending ||
                                !selectedRole ||
                                currentMode === 'allow'
                              }
                              onClick={() => {
                                if (!selectedRole) return;
                                setPendingRoleConfirmation({
                                  roleDefinitionId: selectedRole.id,
                                  roleName: selectedRole.name,
                                  permissionId: permission.id,
                                  permissionLabel: permission.key,
                                  mode: 'allow',
                                });
                              }}
                            >
                              Allow
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                currentMode === 'deny' ? 'destructive' : 'outline'
                              }
                              disabled={
                                !canManageAccess ||
                                isRoleUpdatePending ||
                                !selectedRole ||
                                currentMode === 'deny'
                              }
                              onClick={() => {
                                if (!selectedRole) return;
                                setPendingRoleConfirmation({
                                  roleDefinitionId: selectedRole.id,
                                  roleName: selectedRole.name,
                                  permissionId: permission.id,
                                  permissionLabel: permission.key,
                                  mode: 'deny',
                                });
                              }}
                            >
                              Deny
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCogIcon className="size-4 text-accent" />
            <CardTitle>Member Overrides</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {userMessage && (
            <Alert>
              <AlertTitle>Member override updated</AlertTitle>
              <AlertDescription>{userMessage}</AlertDescription>
            </Alert>
          )}

          {userError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to update member override</AlertTitle>
              <AlertDescription>{userError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
            <div className="space-y-3">
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
                disabled={!canManageAccess || isUserUpdatePending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.identityId} value={member.identityId}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Choose module
                </p>
                <Select
                  value={selectedMemberEntity}
                  onValueChange={setSelectedMemberEntity}
                  disabled={!canManageAccess || isUserUpdatePending}
                >
                  <SelectTrigger className="mt-3 w-full">
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionsByEntity.map((group) => (
                      <SelectItem key={group.entity} value={group.entity}>
                        {group.entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {selectedMemberPermissionGroup && (
                <Card className="border-border/70 bg-background/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {selectedMemberPermissionGroup.entity}
                    </CardTitle>
                    <CardDescription>
                      Direct member overrides sit on top of role policy for the
                      selected workspace member.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedMemberPermissionGroup.permissions.map((permission) => {
                      const currentOverride = selectedMemberOverrideMap.get(
                        permission.id,
                      );
                      const memberBaseAllowed = selectedMemberRole
                        ? selectedMemberRole.basePermissionIds.includes(permission.id)
                        : false;
                      const memberRoleMode =
                        (selectedMemberRole &&
                          roleOverrideModes[selectedMemberRole.id]?.[permission.id]) ??
                        'inherit';
                      const memberRoleAllows =
                        memberRoleMode === 'allow'
                          ? true
                          : memberRoleMode === 'deny'
                            ? false
                            : memberBaseAllowed;
                      const effectiveStatus = currentOverride
                        ? currentOverride.effect === 'ALLOW'
                          ? 'allowed'
                          : 'denied'
                        : memberRoleAllows
                          ? 'allowed'
                          : 'not_allowed';
                      const statusLabel = currentOverride
                        ? `Direct ${currentOverride.effect.toLowerCase()}`
                        : memberRoleAllows
                          ? `Role allows via ${selectedMember?.roleName ?? 'member role'}`
                          : `Not allowed via ${selectedMember?.roleName ?? 'member role'}`;

                      return (
                        <div
                          key={permission.id}
                          className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {permission.name ?? permission.key}
                              </p>
                              <Badge
                                variant={
                                  effectiveStatus === 'allowed'
                                    ? 'secondary'
                                    : effectiveStatus === 'denied'
                                      ? 'destructive'
                                      : 'outline'
                                }
                              >
                                {statusLabel}
                              </Badge>
                            </div>
                            <p className="mt-1 break-all text-xs text-muted-foreground">
                              {permission.key}
                            </p>
                            {permission.description && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                            {currentOverride && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Granted by {currentOverride.grantedByName ?? 'Unknown'} on{' '}
                                {new Date(currentOverride.createdAt).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                effectiveStatus === 'allowed'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              disabled={
                                !canManageAccess ||
                                isUserUpdatePending ||
                                !selectedMemberId ||
                                effectiveStatus === 'allowed'
                              }
                              onClick={() => {
                                if (!selectedMember) return;
                                setPendingUserConfirmation({
                                  action: 'allow',
                                  identityId: selectedMember.identityId,
                                  memberName: selectedMember.name,
                                  permissionId: permission.id,
                                  permissionLabel: permission.key,
                                });
                              }}
                            >
                              Allow
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                effectiveStatus === 'denied'
                                  ? 'destructive'
                                  : 'outline'
                              }
                              disabled={
                                !canManageAccess ||
                                isUserUpdatePending ||
                                !selectedMemberId ||
                                effectiveStatus === 'denied'
                              }
                              onClick={() => {
                                if (!selectedMember) return;
                                setPendingUserConfirmation({
                                  action: 'deny',
                                  identityId: selectedMember.identityId,
                                  memberName: selectedMember.name,
                                  permissionId: permission.id,
                                  permissionLabel: permission.key,
                                });
                              }}
                            >
                              Deny
                            </Button>
                            {currentOverride && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!canManageAccess || isUserUpdatePending}
                                onClick={() => {
                                  if (!selectedMember) return;
                                  setPendingUserConfirmation({
                                    action: 'clear',
                                    identityId: selectedMember.identityId,
                                    memberName: selectedMember.name,
                                    permissionId: permission.id,
                                    permissionLabel: permission.key,
                                    userPermissionId: currentOverride.id,
                                  });
                                }}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!canManageAccess && (
        <Alert>
          <KeyRoundIcon className="size-4" />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            Updating role or member overrides requires permission management
            access in this workspace.
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog
        open={Boolean(pendingRoleConfirmation)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRoleConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role policy change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleConfirmation
                ? `This will ${pendingRoleConfirmation.mode} ${pendingRoleConfirmation.permissionLabel} for the ${pendingRoleConfirmation.roleName} role. All members assigned this role in this workspace will feel the impact.`
                : 'Review this role change before applying it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingRoleConfirmation) return;
                applyRoleOverrideChange(
                  pendingRoleConfirmation.roleDefinitionId,
                  pendingRoleConfirmation.permissionId,
                  pendingRoleConfirmation.mode,
                );
                setPendingRoleConfirmation(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingUserConfirmation)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingUserConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm member override</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingUserConfirmation
                ? pendingUserConfirmation.action === 'clear'
                  ? `This will remove the direct override for ${pendingUserConfirmation.permissionLabel} on ${pendingUserConfirmation.memberName}. Role policy will apply again after this.`
                  : `This will ${pendingUserConfirmation.action} ${pendingUserConfirmation.permissionLabel} directly for ${pendingUserConfirmation.memberName}. This member-specific override will take precedence over role policy.`
                : 'Review this member-specific access change before applying it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingUserConfirmation) return;
                if (
                  pendingUserConfirmation.action === 'clear' &&
                  pendingUserConfirmation.userPermissionId
                ) {
                  applyUserOverrideRevoke(
                    pendingUserConfirmation.userPermissionId,
                  );
                } else {
                  applyUserOverrideChange(
                    pendingUserConfirmation.permissionId,
                    pendingUserConfirmation.action === 'allow'
                      ? 'ALLOW'
                      : 'DENY',
                  );
                }
                setPendingUserConfirmation(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
