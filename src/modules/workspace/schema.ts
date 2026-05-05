import { z } from 'zod';
import { reservedWorkspaceSlugs } from '@/modules/workspace/constants';

function normalizeWorkspaceName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function slugifyWorkspaceName(value: string) {
  return normalizeWorkspaceName(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
    .replace(/-$/g, '');
}

export const workspaceSlugSchema = z
  .string()
  .min(2, 'Workspace slug is too short')
  .max(63, 'Workspace slug is too long')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Workspace slug can only contain lowercase letters, numbers, and hyphens',
  )
  .refine((value) => !reservedWorkspaceSlugs.includes(value as (typeof reservedWorkspaceSlugs)[number]), {
    message: 'This workspace slug is reserved. Try another name.',
  });

export const createWorkspaceFormSchema = z.object({
  workspaceName: z
    .string()
    .min(2, 'Workspace name is too short')
    .max(64, 'Workspace name is too long')
    .transform(normalizeWorkspaceName)
    .refine((value) => slugifyWorkspaceName(value).length >= 2, {
      message: 'Enter a valid workspace name',
    }),
});

export type CreateWorkspaceFormInput = z.input<typeof createWorkspaceFormSchema>;

export const createWorkspaceActionSchema = createWorkspaceFormSchema;

export type CreateWorkspaceActionInput = z.input<
  typeof createWorkspaceActionSchema
>;

export const createWorkspaceSchema = createWorkspaceActionSchema.transform(
  (data) => {
    const workspaceName = normalizeWorkspaceName(data.workspaceName);
    const workspaceSlug = slugifyWorkspaceName(workspaceName);
    workspaceSlugSchema.parse(workspaceSlug);

    return {
      workspaceName,
      workspaceSlug,
    };
  },
);

export type CreateWorkspaceDomain = z.output<typeof createWorkspaceSchema>;
