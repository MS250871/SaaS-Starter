import { z } from 'zod';

export const workspaceFeatureOverrideActionSchema = z.object({
  workspaceId: z.string().uuid('Workspace is required'),
  featureId: z.string().uuid('Feature is required'),
  isEnabled: z.boolean().default(true),
});

export const workspaceLimitOverrideActionSchema = z.object({
  workspaceId: z.string().uuid('Workspace is required'),
  limitDefinitionId: z.string().uuid('Limit is required'),
  valueInt: z.coerce
    .number()
    .int('Override value must be a whole number')
    .min(0, 'Override value cannot be negative'),
});

export const workspaceOverrideDeleteActionSchema = z.object({
  overrideId: z.string().uuid('Override is required'),
});

export type WorkspaceFeatureOverrideActionInput = z.input<
  typeof workspaceFeatureOverrideActionSchema
>;

export type WorkspaceLimitOverrideActionInput = z.input<
  typeof workspaceLimitOverrideActionSchema
>;

export type WorkspaceOverrideDeleteActionInput = z.input<
  typeof workspaceOverrideDeleteActionSchema
>;
