import {
  withActionContext,
  withActionTxContext,
} from '@/lib/request/withActionContext';
import { handleError, extractAppError } from '@/lib/errors/app-error';
/**
 * Navigation Actions:
 * - DO NOT return ApiResponse
 * - May redirect()
 * - Throw errors for UI handling
 */
type CreateNavActionOptions = {
  useTransaction?: boolean;
};

type AppTaggedError = Error & {
  __appError?: unknown;
};

export function createNavAction<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<void>,
  options?: CreateNavActionOptions,
) {
  return async (...args: TArgs): Promise<void> => {
    const runner = options?.useTransaction
      ? withActionTxContext
      : withActionContext;

    return runner(async () => {
      try {
        await handler(...args);
      } catch (e) {
        if (
          typeof e === 'object' &&
          e !== null &&
          'digest' in e &&
          typeof e.digest === 'string' &&
          e.digest.startsWith('NEXT_REDIRECT')
        ) {
          throw e; // let Next.js handle it
        }

        const existing = extractAppError(e);

        if (existing) {
          //wrap in Error
          console.error('APP ERROR:', existing);
          const err: AppTaggedError = new Error(existing.message);
          err.__appError = existing;
          throw err;
        }

        const normalized = handleError(e);

        // ✅ wrap normalized error too
        const err: AppTaggedError = new Error(normalized.message);
        err.__appError = normalized;
        throw err;
      }
    });
  };
}

export function createTxNavAction<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<void>,
) {
  return createNavAction(handler, { useTransaction: true });
}
