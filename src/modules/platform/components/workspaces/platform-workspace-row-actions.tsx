'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActionToast } from '@/hooks/use-action-toast';
import type { ApiResponse } from '@/lib/http/create-action';

type ActionResult = {
  successMessage?: string;
};

export function PlatformWorkspaceRowActions({
  workspaceId,
  viewHref,
  isActive,
  canToggleWorkspace,
  toggleAction,
}: {
  workspaceId: string;
  viewHref: string;
  isActive: boolean;
  canToggleWorkspace: boolean;
  toggleAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

  const runToggle = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('workspaceId', workspaceId);
      formData.set('isActive', String(!isActive));

      const response = await toggleAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(
        response.data.successMessage,
        'Workspace access was updated.',
      );
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open workspace actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={viewHref}>View workspace</Link>
        </DropdownMenuItem>
        {canToggleWorkspace ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={runToggle}>
              {isActive ? 'Deactivate workspace' : 'Activate workspace'}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
