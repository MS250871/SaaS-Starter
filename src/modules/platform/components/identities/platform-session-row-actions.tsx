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

export function PlatformSessionRowActions({
  sessionId,
  identityHref,
  canRevoke,
  revokeAction,
}: {
  sessionId: string;
  identityHref: string;
  canRevoke: boolean;
  revokeAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const router = useRouter();
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

      showActionSuccess(response.data.successMessage, 'Session revoked.');
      router.refresh();
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
