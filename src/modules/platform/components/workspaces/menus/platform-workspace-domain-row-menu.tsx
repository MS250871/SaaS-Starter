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

export function PlatformWorkspaceDomainRowMenu({
  workspaceId,
  workspaceDomainId,
  domainType,
  isPrimary,
  isVerified,
  canVerifyDomains,
  canSetPrimaryDomains,
  canDeleteDomains,
  refreshVerificationAction,
  setPrimaryAction,
  deleteAction,
}: {
  workspaceId: string;
  workspaceDomainId: string;
  domainType: 'CUSTOM' | 'SUBDOMAIN' | 'PATH' | string;
  isPrimary: boolean;
  isVerified: boolean;
  canVerifyDomains: boolean;
  canSetPrimaryDomains: boolean;
  canDeleteDomains: boolean;
  refreshVerificationAction: (
    formData: FormData,
  ) => Promise<ApiResponse<ActionResult>>;
  setPrimaryAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
  deleteAction: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

  const canRefresh = canVerifyDomains && domainType === 'CUSTOM';
  const canPromote =
    canSetPrimaryDomains &&
    domainType === 'CUSTOM' &&
    isVerified &&
    !isPrimary;
  const canDelete = canDeleteDomains && domainType === 'CUSTOM';

  const runAction = (
    action: (formData: FormData) => Promise<ApiResponse<ActionResult>>,
    fallbackMessage: string,
  ) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('workspaceDomainId', workspaceDomainId);

      const response = await action(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(response.data.successMessage, fallbackMessage);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open domain actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/platform/workspaces/domains/${workspaceDomainId}`}>
            View domain
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/platform/workspaces/${workspaceId}/routing`}>
            View routing
          </Link>
        </DropdownMenuItem>
        {canRefresh || canPromote || canDelete ? <DropdownMenuSeparator /> : null}
        {canRefresh ? (
          <DropdownMenuItem
            onClick={() =>
              runAction(refreshVerificationAction, 'Verification check requested.')
            }
          >
            Refresh verification
          </DropdownMenuItem>
        ) : null}
        {canPromote ? (
          <DropdownMenuItem
            onClick={() => runAction(setPrimaryAction, 'Primary route updated.')}
          >
            Set as primary
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem
            onClick={() => runAction(deleteAction, 'Domain deleted.')}
          >
            Delete domain
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
