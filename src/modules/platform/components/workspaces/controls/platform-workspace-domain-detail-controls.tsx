'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { useActionToast } from '@/hooks/use-action-toast';
import type { ApiResponse } from '@/lib/http/create-action';
import {
  deletePlatformWorkspaceDomainAction,
  refreshPlatformWorkspaceDomainVerificationAction,
  setPlatformWorkspacePrimaryDomainAction,
} from '@/modules/workspace/actions/platform-workspace-domain-admin.actions';

type ActionResult = {
  successMessage?: string;
};

export function PlatformWorkspaceDomainDetailControls({
  workspaceDomainId,
  canRefreshVerification,
  canSetPrimary,
  canDelete,
  afterDeleteHref,
}: {
  workspaceDomainId: string;
  canRefreshVerification: boolean;
  canSetPrimary: boolean;
  canDelete: boolean;
  afterDeleteHref: string;
}) {
  const router = useRouter();
  const { showActionError, showActionSuccess } = useActionToast();
  const [isPending, startTransition] = useTransition();

  const runAction = (
    action: (formData: FormData) => Promise<ApiResponse<ActionResult>>,
    fallbackMessage: string,
    options?: { redirectOnSuccess?: boolean },
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

      if (options?.redirectOnSuccess) {
        router.push(afterDeleteHref);
        router.refresh();
        return;
      }

      router.refresh();
    });
  };

  if (!canRefreshVerification && !canSetPrimary && !canDelete) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {isPending ? <SpinnerButton message="Updating domain..." /> : null}
      {!isPending && canRefreshVerification ? (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            runAction(
              refreshPlatformWorkspaceDomainVerificationAction,
              'Verification check requested.',
            )
          }
        >
          Refresh verification
        </Button>
      ) : null}
      {!isPending && canSetPrimary ? (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            runAction(
              setPlatformWorkspacePrimaryDomainAction,
              'Primary route updated.',
            )
          }
        >
          Set as primary
        </Button>
      ) : null}
      {!isPending && canDelete ? (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            runAction(deletePlatformWorkspaceDomainAction, 'Domain deleted.', {
              redirectOnSuccess: true,
            })
          }
        >
          Delete domain
        </Button>
      ) : null}
    </div>
  );
}
