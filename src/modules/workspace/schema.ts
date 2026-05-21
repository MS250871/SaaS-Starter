import { z } from 'zod';
import { normalizePhone } from '@/lib/auth/auth-utils';
import { reservedWorkspaceSlugs } from '@/modules/workspace/constants';
import {
  isWorkspaceApiKeyScope,
  workspaceApiKeyScopes,
} from '@/modules/workspace/api-key-scopes';
import {
  workspaceFontOptions,
  workspaceRadiusOptions,
} from '@/modules/workspace/theme';

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

function normalizeWorkspacePersonName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const createWorkspaceCustomerFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name is too short')
    .max(80, 'First name is too long'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name is too short')
    .max(80, 'Last name is too long'),
  email: z.email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(6, 'Phone number too short')
    .max(20, 'Phone number too long'),
  externalId: z
    .string()
    .trim()
    .max(120, 'External ID is too long')
    .optional()
    .or(z.literal('')),
});

export type CreateWorkspaceCustomerFormInput = z.input<
  typeof createWorkspaceCustomerFormSchema
>;

export const createWorkspaceCustomerActionSchema =
  createWorkspaceCustomerFormSchema;

export type CreateWorkspaceCustomerActionInput = z.input<
  typeof createWorkspaceCustomerActionSchema
>;

export const createWorkspaceCustomerSchema =
  createWorkspaceCustomerActionSchema.transform((data) => {
    const normalizedPhone = normalizePhone(data.phone);

    if (!normalizedPhone.valid || !normalizedPhone.e164) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['phone'],
          message: 'Enter a valid phone number',
        },
      ]);
    }

    return {
      firstName: normalizeWorkspacePersonName(data.firstName),
      lastName: normalizeWorkspacePersonName(data.lastName),
      email: data.email.trim().toLowerCase(),
      phone: String(normalizedPhone.e164),
      externalId: data.externalId?.trim() || null,
    };
  });

export type CreateWorkspaceCustomerDomain = z.output<
  typeof createWorkspaceCustomerSchema
>;

const hexColorSchema = z.string().regex(/^#([0-9a-fA-F]{6})$/, {
  message: 'Enter a valid 6-digit hex color',
});

export const workspaceThemeFormSchema = z.object({
  primaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  headingFont: z.enum(workspaceFontOptions),
  bodyFont: z.enum(workspaceFontOptions),
  radius: z.enum(workspaceRadiusOptions),
});

export type WorkspaceThemeFormInput = z.input<typeof workspaceThemeFormSchema>;

export const updateWorkspaceThemeActionSchema = workspaceThemeFormSchema;

export type UpdateWorkspaceThemeActionInput = z.input<
  typeof updateWorkspaceThemeActionSchema
>;

export const updateWorkspaceThemeSchema =
  updateWorkspaceThemeActionSchema.transform((data) => ({
    brand: {
      primary: data.primaryColor,
      accent: data.accentColor,
    },
    typography: {
      headingFont: data.headingFont,
      bodyFont: data.bodyFont,
    },
    shape: {
      radius: data.radius,
    },
  }));

export type UpdateWorkspaceThemeDomain = z.output<
  typeof updateWorkspaceThemeSchema
>;

export const createWorkspaceInviteFormSchema = z.object({
  email: z.email('Enter a valid email address'),
  roleKey: z
    .string()
    .trim()
    .min(1, 'Select a workspace role'),
});

export type CreateWorkspaceInviteFormInput = z.input<
  typeof createWorkspaceInviteFormSchema
>;

export const createWorkspaceInviteActionSchema =
  createWorkspaceInviteFormSchema;

export type CreateWorkspaceInviteActionInput = z.input<
  typeof createWorkspaceInviteActionSchema
>;

export const createWorkspaceInviteSchema =
  createWorkspaceInviteActionSchema.transform((data) => ({
    email: data.email.trim().toLowerCase(),
    roleKey: data.roleKey.trim(),
  }));

export type CreateWorkspaceInviteDomain = z.output<
  typeof createWorkspaceInviteSchema
>;

export const workspaceCustomDomainFormSchema = z.object({
  domain: z.string().min(1, 'Custom domain is required'),
  routingMode: z.enum(['CNAME', 'APEX_A']).default('CNAME'),
});

export type WorkspaceCustomDomainFormInput = z.input<
  typeof workspaceCustomDomainFormSchema
>;

export const createWorkspaceCustomDomainActionSchema =
  workspaceCustomDomainFormSchema;

export type CreateWorkspaceCustomDomainActionInput = z.input<
  typeof createWorkspaceCustomDomainActionSchema
>;

export const createWorkspaceCustomDomainSchema =
  createWorkspaceCustomDomainActionSchema.transform((data) => ({
    domain: data.domain.trim().toLowerCase(),
    routingMode: data.routingMode,
  }));

export type CreateWorkspaceCustomDomainDomain = z.output<
  typeof createWorkspaceCustomDomainSchema
>;

export const refreshWorkspaceCustomDomainVerificationActionSchema = z.object({
  workspaceDomainId: z.string().uuid('Invalid workspace domain id'),
});

export type RefreshWorkspaceCustomDomainVerificationActionInput = z.input<
  typeof refreshWorkspaceCustomDomainVerificationActionSchema
>;

export const platformWorkspaceRoutingActionSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace id'),
});

export type PlatformWorkspaceRoutingActionInput = z.input<
  typeof platformWorkspaceRoutingActionSchema
>;

export const platformWorkspaceDomainActionSchema = z.object({
  workspaceDomainId: z.string().uuid('Invalid workspace domain id'),
});

export type PlatformWorkspaceDomainActionInput = z.input<
  typeof platformWorkspaceDomainActionSchema
>;

export const createPlatformWorkspaceCustomDomainActionSchema =
  workspaceCustomDomainFormSchema.extend({
    workspaceId: z.string().uuid('Invalid workspace id'),
  });

export type CreatePlatformWorkspaceCustomDomainActionInput = z.input<
  typeof createPlatformWorkspaceCustomDomainActionSchema
>;

export const createPlatformWorkspaceCustomDomainSchema =
  createPlatformWorkspaceCustomDomainActionSchema.transform((data) => ({
    workspaceId: data.workspaceId,
    domain: data.domain.trim().toLowerCase(),
    routingMode: data.routingMode,
  }));

export type CreatePlatformWorkspaceCustomDomainDomain = z.output<
  typeof createPlatformWorkspaceCustomDomainSchema
>;

export const workspaceRedirectAliasFormSchema = z.object({
  domain: z.string().min(1, 'Redirect alias is required'),
  routingMode: z.enum(['CNAME', 'APEX_A']).default('APEX_A'),
});

export type WorkspaceRedirectAliasFormInput = z.input<
  typeof workspaceRedirectAliasFormSchema
>;

export const createWorkspaceRedirectAliasActionSchema =
  workspaceRedirectAliasFormSchema;

export type CreateWorkspaceRedirectAliasActionInput = z.input<
  typeof createWorkspaceRedirectAliasActionSchema
>;

export const createPlatformWorkspaceRedirectAliasActionSchema =
  workspaceRedirectAliasFormSchema.extend({
    workspaceId: z.string().uuid('Invalid workspace id'),
  });

export type CreatePlatformWorkspaceRedirectAliasActionInput = z.input<
  typeof createPlatformWorkspaceRedirectAliasActionSchema
>;

export const createPlatformWorkspaceRedirectAliasSchema =
  createPlatformWorkspaceRedirectAliasActionSchema.transform((data) => ({
    workspaceId: data.workspaceId,
    domain: data.domain.trim().toLowerCase(),
    routingMode: data.routingMode,
  }));

export type CreatePlatformWorkspaceRedirectAliasDomain = z.output<
  typeof createPlatformWorkspaceRedirectAliasSchema
>;

export const createWorkspaceRedirectAliasSchema =
  createWorkspaceRedirectAliasActionSchema.transform((data) => ({
    domain: data.domain.trim().toLowerCase(),
    routingMode: data.routingMode,
  }));

export type CreateWorkspaceRedirectAliasDomain = z.output<
  typeof createWorkspaceRedirectAliasSchema
>;

export const workspaceRolePermissionOverrideActionSchema = z.object({
  roleDefinitionId: z.string().uuid('Invalid role definition id'),
  permissionId: z.string().uuid('Invalid permission id'),
  mode: z.enum(['inherit', 'allow', 'deny']),
});

export type WorkspaceRolePermissionOverrideActionInput = z.input<
  typeof workspaceRolePermissionOverrideActionSchema
>;

export const workspaceUserPermissionOverrideActionSchema = z.object({
  identityId: z.string().uuid('Invalid identity id'),
  permissionId: z.string().uuid('Invalid permission id'),
  effect: z.enum(['ALLOW', 'DENY']),
});

export type WorkspaceUserPermissionOverrideActionInput = z.input<
  typeof workspaceUserPermissionOverrideActionSchema
>;

export const revokeWorkspaceUserPermissionOverrideActionSchema = z.object({
  userPermissionId: z.string().uuid('Invalid user permission id'),
});

export type RevokeWorkspaceUserPermissionOverrideActionInput = z.input<
  typeof revokeWorkspaceUserPermissionOverrideActionSchema
>;

const workspaceApiKeyScopeSchema = z
  .string()
  .trim()
  .refine((value) => isWorkspaceApiKeyScope(value), {
    message: 'Select a valid API scope',
  });

export const createWorkspaceApiKeyActionSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(64, 'Name is too long'),
  description: z
    .string()
    .trim()
    .max(240, 'Description is too long')
    .optional()
    .or(z.literal('')),
  expiresAt: z.string().trim().optional().or(z.literal('')),
  scopes: z
    .array(workspaceApiKeyScopeSchema)
    .min(1, 'Select at least one API scope'),
});

export type CreateWorkspaceApiKeyActionInput = z.input<
  typeof createWorkspaceApiKeyActionSchema
>;

export const revokeWorkspaceApiKeyActionSchema = z.object({
  apiKeyId: z.string().uuid('Invalid API key id'),
});

export type RevokeWorkspaceApiKeyActionInput = z.input<
  typeof revokeWorkspaceApiKeyActionSchema
>;

export const rotateWorkspaceApiKeyActionSchema = z.object({
  apiKeyId: z.string().uuid('Invalid API key id'),
});

export type RotateWorkspaceApiKeyActionInput = z.input<
  typeof rotateWorkspaceApiKeyActionSchema
>;

export const workspaceApiKeyScopeOptions = workspaceApiKeyScopes;

export const previewWorkspaceCustomerCsvImportActionSchema = z.object({
  csvText: z
    .string()
    .trim()
    .min(1, 'Upload a CSV file to preview')
    .max(1_000_000, 'CSV file is too large'),
  fileName: z.string().trim().optional().or(z.literal('')),
});

export type PreviewWorkspaceCustomerCsvImportActionInput = z.input<
  typeof previewWorkspaceCustomerCsvImportActionSchema
>;

export const importWorkspaceCustomerCsvActionSchema =
  previewWorkspaceCustomerCsvImportActionSchema;

export type ImportWorkspaceCustomerCsvActionInput = z.input<
  typeof importWorkspaceCustomerCsvActionSchema
>;
