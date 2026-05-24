'use client';

import { useTransition } from 'react';
import Link from 'next/link';
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

export function GovernanceRowMenu({
  entityLabel,
  entityId,
  idField,
  viewHref,
  editHref,
  isActive,
  canToggle = true,
  canDelete = true,
  onToggleSuccess,
  onDeleteSuccess,
  toggleAction,
  deleteAction,
}: {
  entityLabel: string;
  entityId: string;
  idField: string;
  viewHref: string;
  editHref: string;
  isActive: boolean;
  canToggle?: boolean;
  canDelete?: boolean;
  onToggleSuccess?: (
    entityId: string,
    next: {
      isActive: boolean;
    },
  ) => void;
  onDeleteSuccess?: (entityId: string) => void;
  toggleAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
  deleteAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

  const runToggle = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set(idField, entityId);
      formData.set('isActive', String(!isActive));

      const response = await toggleAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      onToggleSuccess?.(entityId, {
        isActive: !isActive,
      });
      showActionSuccess(response.data.successMessage, `${entityLabel} updated.`);
    });
  };

  const runDelete = () => {
    const confirmed = window.confirm(
      `Delete this ${entityLabel.toLowerCase()}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set(idField, entityId);

      const response = await deleteAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      onDeleteSuccess?.(entityId);
      showActionSuccess(response.data.successMessage, `${entityLabel} deleted.`);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open {entityLabel} actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={viewHref}>View</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={editHref}>Edit</Link>
        </DropdownMenuItem>
        {canToggle || canDelete ? <DropdownMenuSeparator /> : null}
        {canToggle ? (
          <DropdownMenuItem onClick={runToggle}>
            {isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem onClick={runDelete} className="text-destructive">
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
