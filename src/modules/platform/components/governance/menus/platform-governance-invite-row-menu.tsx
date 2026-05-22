'use client';

import { useTransition } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActionToast } from '@/hooks/use-action-toast';
import type { ApiResponse } from '@/lib/http/create-action';
import type { PlatformGovernanceAssignableRole } from '@/modules/platform/server/platform-governance-team-page-data';

type ActionResult = {
  successMessage?: string;
};

type ChangeInviteRoleActionResult = ActionResult & {
  inviteId: string;
  roleName: string;
  roleKey: string;
  roleSystemKey: string | null;
};

export function PlatformGovernanceInviteRowMenu({
  inviteId,
  canRevoke,
  canManageRoles,
  currentRoleKey,
  assignableRoles,
  onRoleChangeSuccess,
  onRevokeSuccess,
  changeRoleAction,
  revokeAction,
}: {
  inviteId: string;
  canRevoke: boolean;
  canManageRoles: boolean;
  currentRoleKey: string;
  assignableRoles: PlatformGovernanceAssignableRole[];
  onRoleChangeSuccess?: (
    inviteId: string,
    nextRole: {
      roleName: string;
      roleKey: string;
      roleSystemKey: string | null;
    },
  ) => void;
  onRevokeSuccess?: (inviteId: string) => void;
  changeRoleAction: (
    formData: FormData,
  ) => Promise<ApiResponse<ChangeInviteRoleActionResult>>;
  revokeAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isRunning, startActionTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();
  const isPending = isRunning || isRefreshing;
  const availableRoles = assignableRoles.filter((role) => role.key !== currentRoleKey);
  const hasRoleChange = canManageRoles && availableRoles.length > 0;
  const hasAnyAction = canRevoke || hasRoleChange;

  const runRevoke = () => {
    startActionTransition(async () => {
      const formData = new FormData();
      formData.set('inviteId', inviteId);

      const response = await revokeAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      flushSync(() => {
        onRevokeSuccess?.(inviteId);
      });
      showActionSuccess(response.data.successMessage, 'Invite revoked.');
      startRefreshTransition(() => {
        router.refresh();
      });
    });
  };

  const runRoleChange = (roleKey: string) => {
    startActionTransition(async () => {
      const formData = new FormData();
      formData.set('inviteId', inviteId);
      formData.set('roleKey', roleKey);

      const response = await changeRoleAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      flushSync(() => {
        onRoleChangeSuccess?.(response.data.inviteId, {
          roleName: response.data.roleName,
          roleKey: response.data.roleKey,
          roleSystemKey: response.data.roleSystemKey,
        });
      });
      showActionSuccess(response.data.successMessage, 'Invite role updated.');

      startRefreshTransition(() => {
        router.refresh();
      });
    });
  };

  if (!hasAnyAction) {
    return (
      <Button variant="outline" size="icon" disabled>
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">No invite actions available</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open platform invite actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {hasRoleChange ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {availableRoles.map((role) => (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => runRoleChange(role.key)}
                >
                  {role.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {canRevoke ? (
          <DropdownMenuItem onClick={runRevoke}>Revoke invite</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
