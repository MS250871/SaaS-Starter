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

export function PlatformIdentityRowActions({
  identityId,
  viewHref,
  isActive,
  toggleAction,
}: {
  identityId: string;
  viewHref: string;
  isActive: boolean;
  toggleAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

  const runToggle = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('identityId', identityId);
      formData.set('isActive', String(!isActive));

      const response = await toggleAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(
        response.data.successMessage,
        'Identity access was updated.',
      );
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open identity actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={viewHref}>View identity</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={runToggle}>
          {isActive ? 'Deactivate identity' : 'Activate identity'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
