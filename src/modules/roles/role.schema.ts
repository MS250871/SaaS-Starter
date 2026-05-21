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

const optionalTextSchema = z
  .string()
  .trim()
  .max(500, 'Text is too long')
  .optional()
  .or(z.literal(''));

export const governanceRoleActionSchema = z.object({
  scope: z.enum(['WORKSPACE', 'PLATFORM']),
  key: lowerKeySchema,
  name: z.string().trim().min(2, 'Name is too short').max(120, 'Name is too long'),
  description: optionalTextSchema,
  hierarchyRank: z.coerce.number().int().min(0, 'Rank cannot be negative').nullable(),
  isDefault: z.boolean().default(false),
  isAssignable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
