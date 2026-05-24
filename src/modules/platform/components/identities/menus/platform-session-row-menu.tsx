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

export function PlatformSessionRowMenu({
  sessionId,
  identityHref,
  canRevoke,
  onRevokeSuccess,
  revokeAction,
}: {
  sessionId: string;
  identityHref: string;
  canRevoke: boolean;
  onRevokeSuccess?: (sessionId: string) => void;
  revokeAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

  const runRevoke = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('sessionId', sessionId);

      const response = await revokeAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      onRevokeSuccess?.(sessionId);
      showActionSuccess(response.data.successMessage, 'Session revoked.');
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open session actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={identityHref}>View identity</Link>
        </DropdownMenuItem>
        {canRevoke ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={runRevoke}>Revoke session</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
