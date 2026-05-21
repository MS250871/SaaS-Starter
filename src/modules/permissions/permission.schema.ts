import { z } from 'zod';

const lowerKeySchema = z
  .string()
  .trim()
  .min(2, 'Key is too short')
  .max(120, 'Key is too long')
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

export const governancePermissionActionSchema = z.object({
  key: lowerKeySchema,
  entity: z
    .string()
    .trim()
    .min(2, 'Entity is too short')
    .max(80, 'Entity is too long'),
  name: optionalTextSchema,
  description: optionalTextSchema,
  isActive: z.boolean().default(true),
});
