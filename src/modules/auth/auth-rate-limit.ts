import { assertRateLimit, getRequestRateLimitSubject } from '@/lib/security/rate-limit';

export async function assertLoginRateLimit(identifier: string) {
  const requestSubject = getRequestRateLimitSubject('auth-login');

  await assertRateLimit({
    namespace: 'auth.login.ip',
    keyParts: [requestSubject],
    limit: 10,
    windowSeconds: 10 * 60,
    message: 'Too many login attempts. Please try again shortly.',
  });

  await assertRateLimit({
    namespace: 'auth.login.identifier',
    keyParts: [identifier],
    limit: 5,
    windowSeconds: 10 * 60,
    message: 'Too many login attempts for this account. Please try again later.',
  });
}

export async function assertSignupRateLimit(identifier: string) {
  const requestSubject = getRequestRateLimitSubject('auth-signup');

  await assertRateLimit({
    namespace: 'auth.signup.ip',
    keyParts: [requestSubject],
    limit: 8,
    windowSeconds: 15 * 60,
    message: 'Too many signup attempts. Please try again later.',
  });

  await assertRateLimit({
    namespace: 'auth.signup.identifier',
    keyParts: [identifier],
    limit: 3,
    windowSeconds: 30 * 60,
    message: 'Too many signup attempts for this email. Please try again later.',
  });
}

export async function assertOtpResendRateLimit(verificationId: string) {
  const requestSubject = getRequestRateLimitSubject('auth-resend');

  await assertRateLimit({
    namespace: 'auth.otp.resend.ip',
    keyParts: [requestSubject],
    limit: 12,
    windowSeconds: 10 * 60,
    message: 'Too many resend attempts. Please wait before trying again.',
  });

  await assertRateLimit({
    namespace: 'auth.otp.resend.verification',
    keyParts: [verificationId],
    limit: 3,
    windowSeconds: 15 * 60,
    message: 'Too many resend attempts for this verification. Please wait and try again.',
  });
}

export async function assertOtpVerifyRateLimit(verificationId: string) {
  const requestSubject = getRequestRateLimitSubject('auth-verify');

  await assertRateLimit({
    namespace: 'auth.otp.verify.ip',
    keyParts: [requestSubject],
    limit: 25,
    windowSeconds: 10 * 60,
    message: 'Too many verification attempts. Please wait before trying again.',
  });

  await assertRateLimit({
    namespace: 'auth.otp.verify.verification',
    keyParts: [verificationId],
    limit: 6,
    windowSeconds: 15 * 60,
    message:
      'Too many verification attempts for this code. Please request a new verification code.',
  });
}
