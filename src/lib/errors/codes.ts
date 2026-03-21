// /lib/errors/codes.ts

export const ERR = {
  // -------- Client / Input --------
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',

  // -------- Authentication --------
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // -------- Authorization --------
  FORBIDDEN: 'FORBIDDEN',

  // -------- Resources --------
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INVALID_STATE: 'INVALID_STATE',

  // -------- Rate limiting --------
  RATE_LIMITED: 'RATE_LIMITED',

  // -------- OTP / Verification --------
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',

  // -------- Tenant / Multi-tenant --------
  TENANT_REQUIRED: 'TENANT_REQUIRED',
  TENANT_ACCESS_DENIED: 'TENANT_ACCESS_DENIED',

  // -------- Entitlements --------
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',

  // -------- Infrastructure --------
  DB_ERROR: 'DB_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT: 'TIMEOUT',

  // -------- System --------
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERR)[keyof typeof ERR];

export const ERROR_META: Record<
  ErrorCode,
  { status: number; defaultMessage: string }
> = {
  INVALID_INPUT: { status: 400, defaultMessage: 'Invalid input' },
  VALIDATION_ERROR: { status: 400, defaultMessage: 'Validation error' },
  BAD_REQUEST: { status: 400, defaultMessage: 'Bad request' },

  UNAUTHORIZED: { status: 401, defaultMessage: 'Unauthorized' },
  INVALID_CREDENTIALS: { status: 401, defaultMessage: 'Invalid credentials' },
  TOKEN_INVALID: { status: 401, defaultMessage: 'Invalid token' },
  TOKEN_EXPIRED: { status: 401, defaultMessage: 'Token expired' },

  FORBIDDEN: { status: 403, defaultMessage: 'Forbidden' },

  NOT_FOUND: { status: 404, defaultMessage: 'Resource not found' },
  CONFLICT: { status: 409, defaultMessage: 'Conflict' },
  ALREADY_EXISTS: { status: 409, defaultMessage: 'Already exists' },
  INVALID_STATE: { status: 409, defaultMessage: 'Invalid state' },

  RATE_LIMITED: { status: 429, defaultMessage: 'Too many requests' },

  OTP_INVALID: { status: 400, defaultMessage: 'Invalid OTP' },
  OTP_EXPIRED: { status: 400, defaultMessage: 'OTP expired' },

  TENANT_REQUIRED: { status: 400, defaultMessage: 'Tenant context required' },
  TENANT_ACCESS_DENIED: { status: 403, defaultMessage: 'Tenant access denied' },

  FEATURE_NOT_AVAILABLE: {
    status: 403,
    defaultMessage: 'Feature not available',
  },
  LIMIT_EXCEEDED: { status: 403, defaultMessage: 'Limit exceeded' },

  DB_ERROR: { status: 500, defaultMessage: 'Database error' },
  EXTERNAL_SERVICE_ERROR: {
    status: 502,
    defaultMessage: 'External service error',
  },
  TIMEOUT: { status: 504, defaultMessage: 'Operation timed out' },

  NOT_IMPLEMENTED: { status: 501, defaultMessage: 'Not implemented' },
  INTERNAL_ERROR: { status: 500, defaultMessage: 'Internal server error' },
};
