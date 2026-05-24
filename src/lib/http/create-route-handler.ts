import { withRequestContext } from '@/lib/request/withRequestContext';
import { handleError } from '@/lib/errors/app-error';
import { NextResponse } from 'next/server';
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

type CreateRouteHandlerOptions<T> = {
  useTransaction?: boolean;
  audit?: {
    onSuccess?: (
      params: { req: Request; result: T },
    ) => MaybePromise<AuditInputFactoryResult>;
    onError?: (
      params: { req: Request; error: ApiError['error'] },
    ) => MaybePromise<AuditInputFactoryResult>;
  };
};

export function createRouteHandler<T>(
  handler: (req: Request) => Promise<T>,
  options?: CreateRouteHandlerOptions<T>,
) {
  return async (req: Request): Promise<Response> => {
    return withRequestContext(req, async () => {
      try {
        const result = await (options?.useTransaction
          ? withUnitOfWork(async () => {
              const txResult = await handler(req);

              if (options.audit?.onSuccess) {
                await writeAuditInputs(
                  await options.audit.onSuccess({
                    req,
                    result: txResult,
                  }),
                );
              }

              return txResult;
            })
          : (async () => {
              const value = await handler(req);

              if (options?.audit?.onSuccess) {
                await writeAuditInputs(
                  await options.audit.onSuccess({
                    req,
                    result: value,
                  }),
                );
              }

              return value;
            })());

        return NextResponse.json<ApiResponse<T>>({
          success: true,
          data: result,
        });
      } catch (e) {
        const err = handleError(e);

        if (options?.audit?.onError) {
          await tryWriteAuditInputs(
            await options.audit.onError({
              req,
              error: err,
            }),
            'route_handler_error',
          );
        }

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
