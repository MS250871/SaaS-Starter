import { withActionContext } from '@/lib/request/withActionContext';
import { extractAppError, handleError } from '@/lib/errors/app-error';
import {
  clearRequestAuditState,
  getRequestAuditState,
} from '@/lib/context/request-context';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import type {
  AuditInputFactoryResult,
  MaybePromise,
} from '@/lib/http/action-audit';
import {
  tryWriteAuditInputs,
  writeAuditInputs,
} from '@/lib/http/action-audit';

/**
 * Navigation Actions:
 * - DO NOT return ApiResponse
 * - May redirect()
 * - Throw errors for UI handling
 */
type CreateNavActionOptions<TArgs extends unknown[]> = {
  useTransaction?: boolean;
  audit?: {
    onSuccess?: (
      params: { args: TArgs; state?: unknown },
    ) => MaybePromise<AuditInputFactoryResult>;
    onError?: (
      params: {
        args: TArgs;
        error: ReturnType<typeof handleError>;
        state?: unknown;
      },
    ) => MaybePromise<AuditInputFactoryResult>;
  };
};

type AppTaggedError = Error & {
  __appError?: unknown;
};

function isNextRedirectError(error: unknown): error is { digest: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  );
}

export function createNavAction<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<void>,
  options?: CreateNavActionOptions<TArgs>,
) {
  return async (...args: TArgs): Promise<void> => {
    return withActionContext(async () => {
      clearRequestAuditState();

      try {
        let redirectError: unknown;

        const executeHandler = async () => {
          try {
            await handler(...args);
          } catch (error) {
            if (isNextRedirectError(error)) {
              redirectError = error;
            } else {
              throw error;
            }
          }

          if (options?.audit?.onSuccess) {
            await writeAuditInputs(
              await options.audit.onSuccess({
                args,
                state: getRequestAuditState(),
              }),
            );
          }
        };

        if (options?.useTransaction) {
          await withUnitOfWork(executeHandler);
        } else {
          await executeHandler();
        }

        clearRequestAuditState();

        if (redirectError) {
          throw redirectError;
        }
      } catch (e) {
        if (isNextRedirectError(e)) {
          clearRequestAuditState();
          throw e;
        }

        const normalized = handleError(e);

        if (options?.audit?.onError) {
          await tryWriteAuditInputs(
            await options.audit.onError({
              args,
              error: normalized,
              state: getRequestAuditState(),
            }),
            'nav_action_error',
          );
        }

        clearRequestAuditState();

        const existing = extractAppError(e);

        if (existing) {
          console.error('APP ERROR:', existing);
          const err: AppTaggedError = new Error(existing.message);
          err.__appError = existing;
          throw err;
        }

        const err: AppTaggedError = new Error(normalized.message);
        err.__appError = normalized;
        throw err;
      }
    });
  };
}

export function createTxNavAction<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<void>,
  options?: Omit<CreateNavActionOptions<TArgs>, 'useTransaction'>,
) {
  return createNavAction(handler, {
    ...options,
    useTransaction: true,
  });
}
