'use client';

import { useTransition } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

type ChangeRoleActionResult = ActionResult & {
  membershipId: string;
  roleName: string;
  roleKey: string;
  roleSystemKey: string | null;
};

export function PlatformGovernanceMembershipRowMenu({
  membershipId,
  identityHref,
  currentRoleKey,
  isActive,
  canManageRoles,
  assignableRoles,
  onRoleChangeSuccess,
  onToggleSuccess,
  changeRoleAction,
  toggleAction,
}: {
  membershipId: string;
  identityHref: string;
  currentRoleKey: string;
  isActive: boolean;
  canManageRoles: boolean;
  assignableRoles: PlatformGovernanceAssignableRole[];
  onRoleChangeSuccess?: (
    membershipId: string,
    nextRole: {
      roleName: string;
      roleKey: string;
      roleSystemKey: string | null;
    },
  ) => void;
  onToggleSuccess?: (
    membershipId: string,
    next: {
      isActive: boolean;
    },
  ) => void;
  changeRoleAction: (
    formData: FormData,
  ) => Promise<ApiResponse<ChangeRoleActionResult>>;
  toggleAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();
  const isBusy = isPending;
  const availableRoles = assignableRoles.filter((role) => role.key !== currentRoleKey);

  const runToggle = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('membershipId', membershipId);
      formData.set('isActive', String(!isActive));

      const response = await toggleAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      flushSync(() => {
        onToggleSuccess?.(membershipId, {
          isActive: !isActive,
        });
      });
      showActionSuccess(
        response.data.successMessage,
        'Membership access updated.',
      );
    });
  };

  const runRoleChange = (roleKey: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('membershipId', membershipId);
      formData.set('roleKey', roleKey);

      const response = await changeRoleAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      flushSync(() => {
        onRoleChangeSuccess?.(response.data.membershipId, {
          roleName: response.data.roleName,
          roleKey: response.data.roleKey,
          roleSystemKey: response.data.roleSystemKey,
        });
      });
      showActionSuccess(response.data.successMessage, 'Membership role updated.');
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isBusy}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open platform membership actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={identityHref}>View identity</Link>
        </DropdownMenuItem>
        {canManageRoles && availableRoles.length > 0 ? (
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={runToggle}>
          {isActive ? 'Deactivate membership' : 'Activate membership'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
