import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/**
 * Identity (platform user)
 */
export const identityCrud = buildCud({
  model: 'Identity',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: true,
});

export const identityQueries = buildQueries({
  model: 'Identity',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

/**
 * Customer (workspace end user)
 */
export const customerCrud = buildCud({
  model: 'Customer',
  workspaceScoped: true,
  softDelete: false,
});

export const customerQueries = buildQueries({
  model: 'Customer',
  workspaceScoped: true,
});

/**
 * OTP Requests
 */
export const otpCrud = buildCud({
  model: 'OtpRequest',
  workspaceScoped: false,
  softDelete: false,
});

export const otpQueries = buildQueries({
  model: 'OtpRequest',
  workspaceScoped: false,
});

/**
 * Sessions
 */
export const sessionCrud = buildCud({
  model: 'Session',
  workspaceScoped: false,
  softDelete: false,
  activeField: 'isActive',
});

export const sessionQueries = buildQueries({
  model: 'Session',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

/**
 * Auth Accounts (email/phone login)
 */
export const authAccountCrud = buildCud({
  model: 'AuthAccount',
  workspaceScoped: false,
  softDelete: false,
});

export const authAccountQueries = buildQueries({
  model: 'AuthAccount',
  workspaceScoped: false,
});

/**
 * OAuth Accounts (Google, etc)
 */
export const oauthAccountCrud = buildCud({
  model: 'OAuthAccount',
  workspaceScoped: false,
  softDelete: false,
});

export const oauthAccountQueries = buildQueries({
  model: 'OAuthAccount',
  workspaceScoped: false,
});
