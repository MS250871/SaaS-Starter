import { NextResponse } from 'next/server';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { handleError } from '@/lib/errors/app-error';
import type {
  AuditInputFactoryResult,
  MaybePromise,
} from '@/lib/http/action-audit';
import {
  tryWriteAuditInputs,
  writeAuditInputs,
} from '@/lib/http/action-audit';
import { withPublicContext } from '@/lib/request/withPublicContext';
import {
  assertRateLimit,
  getRequestIpFromHeaders,
} from '@/lib/security/rate-limit';

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

export type WebhookRouteResponse<T> = ApiSuccess<T> | ApiError;

type CreateWebhookRouteHandlerOptions<T> = {
  useTransaction?: boolean;
  requestContext?: {
    path?: string;
    method?: string;
  };
  rateLimit?: {
    byIp?: {
      limit: number;
      windowSeconds: number;
      message?: string;
    };
  };
  buildSuccessResponse?: (result: T) => Response;
  buildErrorResponse?: (
    error: ApiError['error'],
  ) => Response;
  audit?: {
    onSuccess?: (
      params: { req: Request; result: T },
    ) => MaybePromise<AuditInputFactoryResult>;
    onError?: (
      params: { req: Request; error: ApiError['error'] },
    ) => MaybePromise<AuditInputFactoryResult>;
  };
};

export function createWebhookRouteHandler<T>(
  handler: (req: Request) => Promise<T>,
  options?: CreateWebhookRouteHandlerOptions<T>,
) {
  return async (req: Request): Promise<Response> => {
    const requestPath =
      options?.requestContext?.path ?? new URL(req.url).pathname;

    return withPublicContext(
      {
        request: req,
        requestContext: {
          method: options?.requestContext?.method ?? req.method,
          path: requestPath,
        },
        useTransaction: false,
      },
      async () => {
        try {
          if (options?.rateLimit?.byIp) {
            await assertRateLimit({
              namespace: 'webhook.route.ip',
              keyParts: [requestPath, getRequestIpFromHeaders(req) ?? 'unknown'],
              limit: options.rateLimit.byIp.limit,
              windowSeconds: options.rateLimit.byIp.windowSeconds,
              message:
                options.rateLimit.byIp.message ??
                'Too many webhook requests. Please retry later.',
            });
          }

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

          return (
            options?.buildSuccessResponse?.(result) ??
            NextResponse.json<WebhookRouteResponse<T>>({
              success: true,
              data: result,
            })
          );
        } catch (e) {
          const err = handleError(e);

          if (options?.audit?.onError) {
            await tryWriteAuditInputs(
              await options.audit.onError({
                req,
                error: err,
              }),
              'webhook_route_error',
            );
          }

          return (
            options?.buildErrorResponse?.(err) ??
            NextResponse.json<WebhookRouteResponse<T>>(
              {
                success: false,
                error: err,
              },
              {
                status: err.status,
              },
            )
          );
        }
      },
    );
  };
}
