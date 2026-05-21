'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useActionToast } from '@/hooks/use-action-toast';
import type { ApiResponse } from '@/lib/http/create-action';

type ActionResult = {
  successMessage?: string;
};

export function PlatformOperationsAsyncButton({
  action,
  fields,
  label,
  pendingLabel,
  disabled,
  variant = 'outline',
  size = 'sm',
}: {
  action: (formData: FormData) => Promise<ApiResponse<ActionResult>>;
  fields: Record<string, string>;
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

  const runAction = () => {
    startTransition(async () => {
      const formData = new FormData();

      for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
      }

      const response = await action(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(response.data.successMessage);
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={runAction}
      disabled={disabled || isPending}
    >
      {isPending ? pendingLabel : label}
    </Button>
  );
}
