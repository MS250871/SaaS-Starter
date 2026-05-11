import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { runWithContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { handleError } from '@/lib/errors/app-error';
import { prisma } from '@/lib/prisma';
import {
  recordApiKeyUsage,
  validateApiKey,
} from '@/modules/workspace/services/apikey.services';

export type ApiKeyRequestAuth = {
  apiKeyId: string;
  workspaceId: string;
  apiKeyName: string;
  keyPrefix: string | null;
  scopes: string[];
  createdById: string | null;
  expiresAt: string | null;
};

type CreateApiKeyRouteHandlerOptions = {
  requiredScopes?: string[];
  touchLastUsed?: boolean;
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
  options?: CreateApiKeyRouteHandlerOptions,
) {
  return async (req: Request): Promise<Response> => {
    try {
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

      if (options?.touchLastUsed !== false) {
        await recordApiKeyUsage(apiKey.id);
      }

      const url = new URL(req.url);

      return runWithContext(
        {
          requestId: crypto.randomUUID(),
          method: req.method,
          path: url.pathname,
          ip:
            req.headers
              .get('x-forwarded-for')
              ?.split(',')[0]
              ?.trim() ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
          workspace: {
            workspaceId: workspace.id,
            slug: workspace.slug,
            isActive: workspace.isActive,
            primaryDomain: workspace.defaultDomain ?? undefined,
          },
        },
        async () => {
          const result = await handler(req, {
            apiKeyId: apiKey.id,
            workspaceId: apiKey.workspaceId,
            apiKeyName: apiKey.name,
            keyPrefix: apiKey.keyPrefix ?? null,
            scopes: apiKey.scopes,
            createdById: apiKey.createdById ?? null,
            expiresAt: apiKey.expiresAt?.toISOString() ?? null,
          });

          return NextResponse.json({
            success: true,
            data: result,
          });
        },
      );
    } catch (e) {
      const err = handleError(e);

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
