import { withActionContext } from '@/lib/request/withActionContext';
import { handleError } from '@/lib/errors/app-error';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import type {
  AuditInputFactoryResult,
  MaybePromise,
} from '@/lib/http/action-audit';
import {
  tryWriteAuditInputs,
  writeAuditInputs,
} from '@/lib/http/action-audit';

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

type CreateActionOptions<TArgs extends unknown[], TResult> = {
  useTransaction?: boolean;
  audit?: {
    onSuccess?: (
      params: { args: TArgs; result: TResult },
    ) => MaybePromise<AuditInputFactoryResult>;
    onError?: (
      params: { args: TArgs; error: ApiError['error'] },
    ) => MaybePromise<AuditInputFactoryResult>;
  };
};

export function createAction<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
  options?: CreateActionOptions<TArgs, TResult>,
) {
  return async (...args: TArgs): Promise<ApiResponse<TResult>> => {
    return withActionContext(async () => {
      try {
        const result = await (options?.useTransaction
          ? withUnitOfWork(async () => {
              const txResult = await handler(...args);

              if (options.audit?.onSuccess) {
                await writeAuditInputs(
                  await options.audit.onSuccess({
                    args,
                    result: txResult,
                  }),
                );
              }

              return txResult;
            })
          : (async () => {
              const value = await handler(...args);

              if (options?.audit?.onSuccess) {
                await writeAuditInputs(
                  await options.audit.onSuccess({
                    args,
                    result: value,
                  }),
                );
              }

              return value;
            })());

        return {
          success: true,
          data: result,
        };
      } catch (e) {
        const err = handleError(e);

        if (options?.audit?.onError) {
          await tryWriteAuditInputs(
            await options.audit.onError({
              args,
              error: err,
            }),
            'action_error',
          );
        }

        return {
          success: false,
          error: err,
        };
      }
    });
  };
}

export function createTxAction<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
  options?: Omit<CreateActionOptions<TArgs, TResult>, 'useTransaction'>,
) {
  return createAction(handler, {
    ...options,
    useTransaction: true,
  });
}
