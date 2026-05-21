'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActionToast } from '@/hooks/use-action-toast';
import type { ApiResponse } from '@/lib/http/create-action';

type ActionResult = {
  successMessage?: string;
};

export function PlatformGovernanceRoleRowActions({
  roleDefinitionId,
  isActive,
  canToggle,
  toggleAction,
}: {
  roleDefinitionId: string;
  isActive: boolean;
  canToggle: boolean;
  toggleAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

  const runToggle = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('roleDefinitionId', roleDefinitionId);
      formData.set('isActive', String(!isActive));

      const response = await toggleAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(response.data.successMessage, 'Role access updated.');
      router.refresh();
    });
  };

  if (!canToggle) {
    return (
      <Button variant="outline" size="icon" disabled>
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">No role actions available</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open role actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={runToggle}>
          {isActive ? 'Deactivate role' : 'Activate role'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
