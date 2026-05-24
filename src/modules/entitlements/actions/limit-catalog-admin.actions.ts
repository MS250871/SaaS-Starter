'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createLimit,
  deleteLimitDefinition,
  updateLimitDefinition,
} from '@/modules/entitlements/services/entitlement.services';
import { invalidateCatalogCache } from '@/modules/entitlements/services/catalog-cache.services';
import {
  parseCheckboxValue,
  platformCatalogLimitActionSchema,
} from '@/modules/platform/catalog.schema';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

function buildCatalogAuditInput(params: {
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return {
    scope: 'PLATFORM' as const,
    category: 'CATALOG' as const,
    source: 'ADMIN_PANEL' as const,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  };
}

const createLimitCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const parsed = platformCatalogLimitActionSchema.parse({
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    unit: formData.get('unit') ?? '',
    sortOrder: formData.get('sortOrder') ?? 0,
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const limit = await createLimit({
    key: parsed.key,
    name: parsed.name,
    description: parsed.description || null,
    unit: parsed.unit || null,
    sortOrder: parsed.sortOrder,
    isActive: parsed.isActive,
  });

  return {
    limitId: limit.id,
    successMessage: `${limit.name} created successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];
      const name = String(formData.get('name') ?? '').trim();
      const key = String(formData.get('key') ?? '').trim();

      return buildCatalogAuditInput({
        action: 'catalog.limit.create',
        entityType: 'LimitDefinition',
        entityId: result.limitId,
        description: `Limit ${name || key || result.limitId} created.`,
        metadata: {
          isActive: parseCheckboxValue(formData, 'isActive'),
          key,
          unit: String(formData.get('unit') ?? '').trim() || null,
        },
      });
    },
  },
});

const updateLimitCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const limitId = String(formData.get('limitId') ?? '').trim();

  if (!limitId) {
    throwError(ERR.INVALID_INPUT, 'Limit ID is required');
  }

  const parsed = platformCatalogLimitActionSchema.parse({
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    unit: formData.get('unit') ?? '',
    sortOrder: formData.get('sortOrder') ?? 0,
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const limit = await updateLimitDefinition(limitId, {
    key: parsed.key,
    name: parsed.name,
    description: parsed.description || null,
    unit: parsed.unit || null,
    sortOrder: parsed.sortOrder,
    isActive: parsed.isActive,
  });

  return {
    limitId: limit.id,
    successMessage: `${limit.name} updated successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];
      const name = String(formData.get('name') ?? '').trim();
      const key = String(formData.get('key') ?? '').trim();

      return buildCatalogAuditInput({
        action: 'catalog.limit.update',
        entityType: 'LimitDefinition',
        entityId: result.limitId,
        description: `Limit ${name || key || result.limitId} updated.`,
        metadata: {
          isActive: parseCheckboxValue(formData, 'isActive'),
          key,
          unit: String(formData.get('unit') ?? '').trim() || null,
        },
      });
    },
  },
});

const toggleLimitCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const limitId = String(formData.get('limitId') ?? '').trim();

  if (!limitId) {
    throwError(ERR.INVALID_INPUT, 'Limit ID is required');
  }

  const isActive = parseCheckboxValue(formData, 'isActive');
  const limit = await updateLimitDefinition(limitId, { isActive });

  return {
    limitId: limit.id,
    successMessage: `${limit.name} ${
      isActive ? 'activated' : 'deactivated'
    } successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];
      const isActive = parseCheckboxValue(formData, 'isActive');

      return buildCatalogAuditInput({
        action: isActive ? 'catalog.limit.activate' : 'catalog.limit.deactivate',
        entityType: 'LimitDefinition',
        entityId: result.limitId,
        description: `Limit ${isActive ? 'activated' : 'deactivated'}.`,
        metadata: { isActive },
      });
    },
  },
});

const deleteLimitCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const limitId = String(formData.get('limitId') ?? '').trim();

  if (!limitId) {
    throwError(ERR.INVALID_INPUT, 'Limit ID is required');
  }

  await deleteLimitDefinition(limitId);

  return {
    successMessage: 'Limit deleted successfully.',
  };
}, {
  audit: {
    onSuccess: ({ args }) => {
      const formData = args[0];
      const limitId = String(formData.get('limitId') ?? '').trim();

      return buildCatalogAuditInput({
        action: 'catalog.limit.delete',
        entityType: 'LimitDefinition',
        entityId: limitId,
        description: 'Limit deleted.',
      });
    },
  },
});

export async function createLimitCatalogAction(formData: FormData) {
  const response = await createLimitCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function updateLimitCatalogAction(formData: FormData) {
  const response = await updateLimitCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function toggleLimitCatalogAction(formData: FormData) {
  const response = await toggleLimitCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function deleteLimitCatalogAction(formData: FormData) {
  const response = await deleteLimitCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}
