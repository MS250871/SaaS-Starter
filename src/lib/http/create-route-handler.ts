import { withRequestContext } from '@/lib/request/withRequestContext';
import { handleError } from '@/lib/errors/app-error';
import { NextResponse } from 'next/server';

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

export function createRouteHandler<T>(handler: (req: Request) => Promise<T>) {
  return async (req: Request): Promise<Response> => {
    return withRequestContext(req, async () => {
      try {
        const result = await handler(req);

        return NextResponse.json<ApiResponse<T>>({
          success: true,
          data: result,
        });
      } catch (e) {
        const err = handleError(e);

        return NextResponse.json<ApiResponse<T>>(
          {
            success: false,
            error: err,
          },
          {
            status: err.status,
          },
        );
      }
    });
  };
}
