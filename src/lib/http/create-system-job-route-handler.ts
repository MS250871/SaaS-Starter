import { NextResponse } from 'next/server';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { appError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { handleError } from '@/lib/errors/app-error';
import type {
  AuditInputFactoryResult,
  MaybePromise,
} from '@/lib/http/action-audit';
import {
  tryWriteAuditInputs,
  writeAuditInputs,
} from '@/lib/http/action-audit';
import { verifyQStashRequestSignature } from '@/lib/qstash';
import { withSystemJobContext } from '@/lib/request/withSystemJobContext';

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

export type SystemJobRouteResponse<T> = ApiSuccess<T> | ApiError;

type CreateSystemJobRouteHandlerOptions<T> = {
  useTransaction?: boolean;
  requestContext?: {
    path?: string;
    method?: string;
  };
  auth?: {
    requireQStashSignature?: boolean;
    clockToleranceSeconds?: number;
  };
  audit?: {
    onSuccess?: (
      params: { req: Request; result: T },
    ) => MaybePromise<AuditInputFactoryResult>;
    onError?: (
      params: { req: Request; error: ApiError['error'] },
    ) => MaybePromise<AuditInputFactoryResult>;
  };
};

export function createSystemJobRouteHandler<T>(
  handler: (req: Request) => Promise<T>,
  options?: CreateSystemJobRouteHandlerOptions<T>,
) {
  return async (req: Request): Promise<Response> => {
    if (options?.auth?.requireQStashSignature !== false) {
      const isValidQStashRequest = await verifyQStashRequestSignature(req, {
        clockToleranceSeconds: options?.auth?.clockToleranceSeconds,
      });

      if (!isValidQStashRequest) {
        const err = appError(
          ERR.UNAUTHORIZED,
          'Invalid or missing QStash worker signature.',
        );

        if (options?.audit?.onError) {
          await tryWriteAuditInputs(
            await options.audit.onError({
              req,
              error: err,
            }),
            'system_job_route_error',
          );
        }

        return NextResponse.json<SystemJobRouteResponse<T>>(
          {
            success: false,
            error: err,
          },
          {
            status: err.status,
          },
        );
      }
    }

    return withSystemJobContext(
      {
        request: req,
        requestContext: {
          method: options?.requestContext?.method ?? req.method,
          path:
            options?.requestContext?.path ?? new URL(req.url).pathname,
        },
        useTransaction: false,
      },
      async () => {
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

          return NextResponse.json<SystemJobRouteResponse<T>>({
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
              'system_job_route_error',
            );
          }

          return NextResponse.json<SystemJobRouteResponse<T>>(
            {
              success: false,
              error: err,
            },
            {
              status: err.status,
            },
          );
        }
      },
    );
  };
}
