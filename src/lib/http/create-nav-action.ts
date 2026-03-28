import { withActionContext } from '@/lib/request/withActionContext';
import { handleError, extractAppError } from '@/lib/errors/app-error';
/**
 * Navigation Actions:
 * - DO NOT return ApiResponse
 * - May redirect()
 * - Throw errors for UI handling
 */
export function createNavAction<TArgs extends any[]>(
  handler: (...args: TArgs) => Promise<void>,
) {
  return async (...args: TArgs): Promise<void> => {
    return withActionContext(async () => {
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
          const err = new Error(existing.message);
          (err as any).__appError = existing;
          throw err;
        }

        const normalized = handleError(e);

        // ✅ wrap normalized error too
        const err = new Error(normalized.message);
        (err as any).__appError = normalized;
        throw err;
      }
    });
  };
}
