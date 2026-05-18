import { BillingInterval, Currency, ProductType } from '@/generated/prisma/client';
import { z } from 'zod';

const lowerKeySchema = z
  .string()
  .trim()
  .min(2, 'Key is too short')
  .max(80, 'Key is too long')
  .regex(
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
    'Use lowercase letters, numbers, dots, hyphens, or underscores.',
  );

const upperCodeSchema = z
  .string()
  .trim()
  .min(2, 'Code is too short')
  .max(80, 'Code is too long')
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(value),
    'Use uppercase letters, numbers, and underscores.',
  );

const optionalTextSchema = z
  .string()
  .trim()
  .max(500, 'Text is too long')
  .optional()
  .or(z.literal(''));

export const platformCatalogPlanActionSchema = z.object({
  key: lowerKeySchema,
  name: z.string().trim().min(2, 'Name is too short').max(120, 'Name is too long'),
  description: optionalTextSchema,
  sortOrder: z.coerce.number().int().min(0, 'Sort order cannot be negative'),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
});

export const platformCatalogProductActionSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(120, 'Name is too long'),
  code: upperCodeSchema,
  planId: z.string().uuid().optional().nullable(),
  type: z.nativeEnum(ProductType),
  description: optionalTextSchema,
  isActive: z.boolean().default(true),
});

export const platformCatalogPriceActionSchema = z.object({
  productId: z.string().uuid('Product is required'),
  amount: z.coerce.number().int().min(0, 'Amount cannot be negative'),
  currency: z.nativeEnum(Currency),
  interval: z.nativeEnum(BillingInterval).optional().nullable(),
  providerPriceId: z
    .string()
    .trim()
    .max(120, 'Provider price id is too long')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const platformCatalogFeatureActionSchema = z.object({
  key: lowerKeySchema,
  name: z.string().trim().min(2, 'Name is too short').max(120, 'Name is too long'),
  description: optionalTextSchema,
  category: z
    .string()
    .trim()
    .max(80, 'Category is too long')
    .optional()
    .or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0, 'Sort order cannot be negative'),
  isActive: z.boolean().default(true),
});

export const platformCatalogLimitActionSchema = z.object({
  key: lowerKeySchema,
  name: z.string().trim().min(2, 'Name is too short').max(120, 'Name is too long'),
  description: optionalTextSchema,
  unit: z
    .string()
    .trim()
    .max(40, 'Unit is too long')
    .optional()
    .or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0, 'Sort order cannot be negative'),
  isActive: z.boolean().default(true),
});

export function parseCheckboxValue(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

export function parseNullableUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

export function parseNullableInterval(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

export function parsePlanLimitAssignments(formData: FormData) {
  const assignments: Array<{ limitDefinitionId: string; valueInt: number }> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('limit:')) {
      continue;
    }

    const limitDefinitionId = key.slice('limit:'.length);
    const raw = String(value).trim();

    if (!limitDefinitionId || raw.length === 0) {
      continue;
    }

    const valueInt = Number(raw);

    if (!Number.isFinite(valueInt) || valueInt < 0) {
      continue;
    }

    assignments.push({
      limitDefinitionId,
      valueInt: Math.floor(valueInt),
    });
  }

  return assignments;
}
