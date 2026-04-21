import {
  withActionContext,
  withActionTxContext,
} from '@/lib/request/withActionContext';
import { handleError } from '@/lib/errors/app-error';

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

type CreateActionOptions = {
  useTransaction?: boolean;
};

export function createAction<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
  options?: CreateActionOptions,
) {
  return async (...args: TArgs): Promise<ApiResponse<TResult>> => {
    const runner = options?.useTransaction
      ? withActionTxContext
      : withActionContext;

    return runner(async () => {
      try {
        const result = await handler(...args);

        return {
          success: true,
          data: result,
        };
      } catch (e) {
        const err = handleError(e);

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
) {
  return createAction(handler, { useTransaction: true });
}
