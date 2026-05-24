import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { handleError } from '@/lib/errors/app-error';
import { prisma } from '@/lib/prisma';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import type {
  AuditInputFactoryResult,
  MaybePromise,
} from '@/lib/http/action-audit';
import {
  tryWriteAuditInputs,
  writeAuditInputs,
} from '@/lib/http/action-audit';
import { createAuditEvent } from '@/modules/audit/services/audit-event.services';
import {
  recordApiKeyUsage,
  validateApiKey,
} from '@/modules/workspace/services/apikey.services';
import {
  assertRateLimit,
  getRequestIpFromHeaders,
} from '@/lib/security/rate-limit';

export type ApiKeyRequestAuth = {
  apiKeyId: string;
  workspaceId: string;
  apiKeyName: string;
  keyPrefix: string | null;
  scopes: string[];
  createdById: string | null;
  expiresAt: string | null;
};

type CreateApiKeyRouteHandlerOptions<T> = {
  requiredScopes?: string[];
  touchLastUsed?: boolean;
  useTransaction?: boolean;
  rateLimit?: {
    byIp?: {
      limit: number;
      windowSeconds: number;
    };
    byApiKey?: {
      limit: number;
      windowSeconds: number;
    };
  };
  audit?: {
    onSuccess?: (
      params: { req: Request; auth: ApiKeyRequestAuth; result: T },
    ) => MaybePromise<AuditInputFactoryResult>;
    onError?: (
      params: {
        req: Request;
        auth: ApiKeyRequestAuth | null;
        error: {
          code: string;
          message: string;
          status: number;
          details?: unknown;
        };
      },
    ) => MaybePromise<AuditInputFactoryResult>;
    logSecurityFailures?: boolean;
  };
};

function extractApiKeySecret(req: Request) {
  const authorization = req.headers.get('authorization');

  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();

    if (token) {
      return token;
    }
  }

  const apiKeyHeader = req.headers.get('x-api-key')?.trim();

  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

function hasRequiredApiScopes(actualScopes: string[], requiredScopes: string[]) {
  return requiredScopes.every((scope) => actualScopes.includes(scope));
}

export function createApiKeyRouteHandler<T>(
  handler: (req: Request, auth: ApiKeyRequestAuth) => Promise<T>,
  options?: CreateApiKeyRouteHandlerOptions<T>,
) {
  return async (req: Request): Promise<Response> => {
    let authForAudit: ApiKeyRequestAuth | null = null;
    const url = new URL(req.url);
    const requestId = crypto.randomUUID();
    const requestIp = getRequestIpFromHeaders(req);
    const requestUserAgent = req.headers.get('user-agent') ?? null;

    try {
      await assertRateLimit({
        namespace: 'api.route.ip',
        keyParts: [url.pathname, requestIp ?? 'unknown'],
        limit: options?.rateLimit?.byIp?.limit ?? 120,
        windowSeconds: options?.rateLimit?.byIp?.windowSeconds ?? 60,
        message: 'Too many API requests. Please slow down and try again shortly.',
      });

      const secret = extractApiKeySecret(req);

      if (!secret) {
        throwError(
          ERR.UNAUTHORIZED,
          'Missing API key. Use Authorization: Bearer <api_key> or X-API-Key.',
        );
      }

      const apiKey = await validateApiKey(secret);

      if (!apiKey) {
        throwError(ERR.UNAUTHORIZED, 'Invalid or expired API key.');
      }

      const workspace = await prisma.workspace.findUnique({
        where: {
          id: apiKey.workspaceId,
        },
        select: {
          id: true,
          slug: true,
          isActive: true,
          defaultDomain: true,
        },
      });

      if (!workspace || !workspace.isActive) {
        throwError(
          ERR.TENANT_ACCESS_DENIED,
          'The workspace for this API key is unavailable.',
        );
      }

      const requiredScopes = options?.requiredScopes ?? [];

      if (!hasRequiredApiScopes(apiKey.scopes, requiredScopes)) {
        throwError(
          ERR.FORBIDDEN,
          'This API key does not include the required scopes.',
          undefined,
          {
            requiredScopes,
            grantedScopes: apiKey.scopes,
          },
        );
      }

      authForAudit = {
        apiKeyId: apiKey.id,
        workspaceId: apiKey.workspaceId,
        apiKeyName: apiKey.name,
        keyPrefix: apiKey.keyPrefix ?? null,
        scopes: apiKey.scopes,
        createdById: apiKey.createdById ?? null,
        expiresAt: apiKey.expiresAt?.toISOString() ?? null,
      };

      await assertRateLimit({
        namespace: 'api.route.key',
        keyParts: [url.pathname, apiKey.id],
        limit: options?.rateLimit?.byApiKey?.limit ?? 600,
        windowSeconds: options?.rateLimit?.byApiKey?.windowSeconds ?? 60,
        message:
          'This API key has exceeded its request rate. Please retry in a moment.',
      });

      if (options?.touchLastUsed !== false) {
        await recordApiKeyUsage(apiKey.id);
      }

      return runWithContext(
        {
          requestId,
          method: req.method,
          path: url.pathname,
          ip: requestIp ?? undefined,
          userAgent: requestUserAgent ?? undefined,
          workspace: {
            workspaceId: workspace.id,
            slug: workspace.slug,
            isActive: workspace.isActive,
            primaryDomain: workspace.defaultDomain ?? undefined,
          },
        },
        async () => {
          return runWithActor(
            {
              actorType: 'api_key',
              apiKeyId: apiKey.id,
              apiKeyScopes: apiKey.scopes,
              workspaceId: apiKey.workspaceId,
              identityId: apiKey.createdById ?? undefined,
              permissions: [],
              features: [],
              limits: {},
            },
            async () => {
              const result = await (options?.useTransaction
                ? withUnitOfWork(async () => {
                    const txResult = await handler(req, authForAudit!);

                    if (options.audit?.onSuccess) {
                      await writeAuditInputs(
                        await options.audit.onSuccess({
                          req,
                          auth: authForAudit!,
                          result: txResult,
                        }),
                      );
                    }

                    return txResult;
                  })
                : (async () => {
                    const value = await handler(req, authForAudit!);

                    if (options?.audit?.onSuccess) {
                      await writeAuditInputs(
                        await options.audit.onSuccess({
                          req,
                          auth: authForAudit!,
                          result: value,
                        }),
                      );
                    }

                    return value;
                  })());

              return NextResponse.json({
                success: true,
                data: result,
              });
            },
          );
        },
      );
    } catch (e) {
      const err = handleError(e);

      if (options?.audit?.onError) {
        await tryWriteAuditInputs(
          await options.audit.onError({
            req,
            auth: authForAudit,
            error: err,
          }),
          'api_key_route_error',
        );
      }

      if (options?.audit?.logSecurityFailures !== false && err.status >= 401) {
        try {
          await createAuditEvent({
            scope: authForAudit?.workspaceId ? 'WORKSPACE' : 'SYSTEM',
            category: 'SECURITY',
            source: 'API',
            outcome: err.status === 403 ? 'DENIED' : 'FAILURE',
            severity: err.status === 403 ? 'WARNING' : 'ERROR',
            action: 'api_key.request',
            entityType: 'ApiKey',
            entityId: authForAudit?.apiKeyId ?? null,
            description: err.message,
            workspaceId: authForAudit?.workspaceId ?? null,
            actorType: authForAudit?.apiKeyId ? 'API_KEY' : 'SYSTEM',
            actorApiKeyId: authForAudit?.apiKeyId ?? null,
            actorIdentityId: authForAudit?.createdById ?? null,
            actorName: authForAudit?.apiKeyName ?? null,
            requestId,
            ipAddress: requestIp,
            userAgent: requestUserAgent,
            requestPath: url.pathname,
            requestMethod: req.method,
            metadata: {
              requiredScopes: options?.requiredScopes ?? [],
              grantedScopes: authForAudit?.scopes ?? [],
              keyPrefix: authForAudit?.keyPrefix ?? null,
            },
          });
        } catch (auditError) {
          console.error('API KEY AUDIT FAILURE', auditError);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: err,
        },
        {
          status: err.status,
        },
      );
    }
  };
}
