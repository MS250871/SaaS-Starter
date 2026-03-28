import { withActionContext } from '@/lib/request/withActionContext';
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

export function createAction<TArgs extends any[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs): Promise<ApiResponse<TResult>> => {
    return withActionContext(async () => {
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
