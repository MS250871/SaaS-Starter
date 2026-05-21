import { z } from 'zod';

export const createPlatformInviteFormSchema = z.object({
  email: z.email('Enter a valid email address'),
  roleKey: z.string().trim().min(1, 'Select a platform role'),
});

export type CreatePlatformInviteFormInput = z.input<
  typeof createPlatformInviteFormSchema
>;

export const createPlatformInviteActionSchema = createPlatformInviteFormSchema;

export type CreatePlatformInviteActionInput = z.input<
  typeof createPlatformInviteActionSchema
>;

export const createPlatformInviteSchema = createPlatformInviteActionSchema.transform(
  (data) => ({
    email: data.email.trim().toLowerCase(),
    roleKey: data.roleKey.trim(),
  }),
);

export type CreatePlatformInviteDomain = z.output<
  typeof createPlatformInviteSchema
>;

export const changePlatformInviteRoleActionSchema = z.object({
  inviteId: z.string().trim().min(1, 'Platform invite is required'),
  roleKey: z.string().trim().min(1, 'Select a platform role'),
});

export const changePlatformInviteRoleSchema =
  changePlatformInviteRoleActionSchema.transform((data) => ({
    inviteId: data.inviteId.trim(),
    roleKey: data.roleKey.trim(),
  }));

export type ChangePlatformInviteRoleActionInput = z.input<
  typeof changePlatformInviteRoleActionSchema
>;

export type ChangePlatformInviteRoleDomain = z.output<
  typeof changePlatformInviteRoleSchema
>;

export const changePlatformMembershipRoleActionSchema = z.object({
  membershipId: z.string().trim().min(1, 'Platform membership is required'),
  roleKey: z.string().trim().min(1, 'Select a platform role'),
});

export const changePlatformMembershipRoleSchema =
  changePlatformMembershipRoleActionSchema.transform((data) => ({
    membershipId: data.membershipId.trim(),
    roleKey: data.roleKey.trim(),
  }));

export type ChangePlatformMembershipRoleActionInput = z.input<
  typeof changePlatformMembershipRoleActionSchema
>;

export type ChangePlatformMembershipRoleDomain = z.output<
  typeof changePlatformMembershipRoleSchema
>;
