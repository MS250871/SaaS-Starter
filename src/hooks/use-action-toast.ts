'use client';

import * as React from 'react';

import { toast } from 'sonner';

type ActionToastErrorInput =
  | string
  | {
      message: string;
      code?: string;
      status?: number;
    };

const ACTION_TOAST_DURATION = {
  success: 2600,
  info: 4200,
  warning: 5200,
  error: 6500,
} as const;

function normalizeError(input: ActionToastErrorInput) {
  if (typeof input === 'string') {
    return {
      message: input,
      code: undefined,
      status: undefined,
    };
  }

  return input;
}

function isPermissionWarning(error: {
  message: string;
  code?: string;
  status?: number;
}) {
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.code === 'FORBIDDEN' ||
    error.code === 'UNAUTHORIZED' ||
    /access is required|permission|not allowed/i.test(error.message)
  );
}

export function useActionToast() {
  const showActionSuccess = React.useCallback(
    (message?: string | null, fallbackTitle = 'Action completed.') => {
      toast.success(
        message && message.trim().length > 0 ? message : fallbackTitle,
        {
          duration: ACTION_TOAST_DURATION.success,
        },
      );
    },
    [],
  );

  const showActionError = React.useCallback(
    (input: ActionToastErrorInput, title = 'Action failed') => {
      const error = normalizeError(input);

      if (isPermissionWarning(error)) {
        toast.warning('Action not allowed', {
          description: error.message,
          duration: ACTION_TOAST_DURATION.warning,
        });
        return;
      }

      toast.error(title, {
        description: error.message,
        duration: ACTION_TOAST_DURATION.error,
      });
    },
    [],
  );

  const showActionWarning = React.useCallback(
    (title: string, description?: string) => {
      toast.warning(title, {
        description,
        duration: ACTION_TOAST_DURATION.warning,
      });
    },
    [],
  );

  const showActionInfo = React.useCallback(
    (title: string, description?: string) => {
      toast.info(title, {
        description,
        duration: ACTION_TOAST_DURATION.info,
      });
    },
    [],
  );

  return {
    showActionSuccess,
    showActionError,
    showActionWarning,
    showActionInfo,
  };
}
