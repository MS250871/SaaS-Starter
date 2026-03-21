import { ERROR_META, ErrorCode, ERR } from './codes';

/* -------------------------------------------------------------------------- */
/*                                   TYPE                                     */
/* -------------------------------------------------------------------------- */

export type AppError = {
  __type: 'AppError'; // 👈 discriminator
  code: ErrorCode;
  message: string;
  status: number;
  details?: unknown;
};

/* -------------------------------------------------------------------------- */
/*                               CREATION                                     */
/* -------------------------------------------------------------------------- */

export function appError(
  code: ErrorCode,
  message?: string,
  status?: number,
  details?: unknown,
): AppError {
  const meta = ERROR_META[code];

  return {
    __type: 'AppError',
    code,
    message: message ?? meta.defaultMessage,
    status: status ?? meta.status,
    details,
  };
}

/* -------------------------------------------------------------------------- */
/*                               THROW HELPERS                                */
/* -------------------------------------------------------------------------- */

export function throwError(
  code: ErrorCode,
  message?: string,
  status?: number,
  details?: unknown,
): never {
  const err = appError(code, message, status, details);

  // 👇 preserve stack trace using native Error
  const e = new Error(err.message);
  (e as any).__appError = err;

  throw e;
}

export function throwNamed(code: ErrorCode, overrideMessage?: string): never {
  throwError(code, overrideMessage);
}

/* -------------------------------------------------------------------------- */
/*                               TYPE GUARD                                   */
/* -------------------------------------------------------------------------- */

export function isAppError(e: unknown): e is AppError {
  return (
    typeof e === 'object' &&
    e !== null &&
    '__type' in e &&
    (e as any).__type === 'AppError'
  );
}

/* -------------------------------------------------------------------------- */
/*                              EXTRACTOR (IMPORTANT)                         */
/* -------------------------------------------------------------------------- */

export function extractAppError(e: unknown): AppError | null {
  if (!e) return null;

  // case 1: directly AppError
  if (isAppError(e)) return e;

  // case 2: wrapped in Error
  if (e instanceof Error && (e as any).__appError) {
    return (e as any).__appError as AppError;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                            SAFE HANDLER (API)                              */
/* -------------------------------------------------------------------------- */

export function handleError(e: unknown) {
  const appErr = extractAppError(e);

  if (appErr) {
    return {
      code: appErr.code,
      message: appErr.message,
      status: appErr.status,
      details: appErr.details ?? null,
    };
  }

  console.error('Unhandled error:', e);

  return {
    code: ERR.INTERNAL_ERROR,
    message: ERROR_META.INTERNAL_ERROR.defaultMessage,
    status: ERROR_META.INTERNAL_ERROR.status,
  };
}
