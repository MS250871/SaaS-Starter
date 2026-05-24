import { z } from 'zod';

const nonEmpty = (name: string) =>
  z.string().trim().min(1, `${name} is required`);

function formatIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'env';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

function parseEnv<T>(label: string, schema: z.ZodType<T>) {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `[env] Invalid ${label} configuration. ${formatIssues(result.error)}`,
    );
  }

  return result.data;
}

const authSecuritySchema = z.object({
  AUTH_SECRET: z
    .string()
    .trim()
    .min(32, 'AUTH_SECRET must be at least 32 characters long'),
});

const dataLayerSchema = z.object({
  DATABASE_URL: nonEmpty('DATABASE_URL'),
  UPSTASH_REDIS_REST_URL: z
    .string()
    .trim()
    .url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: nonEmpty('UPSTASH_REDIS_REST_TOKEN'),
});

const qstashSchema = z.object({
  QSTASH_URL: z.string().trim().url('QSTASH_URL must be a valid URL'),
  QSTASH_TOKEN: nonEmpty('QSTASH_TOKEN'),
  QSTASH_CURRENT_SIGNING_KEY: nonEmpty('QSTASH_CURRENT_SIGNING_KEY'),
  QSTASH_NEXT_SIGNING_KEY: nonEmpty('QSTASH_NEXT_SIGNING_KEY'),
});

const razorpaySchema = z
  .object({
    NODE_ENV: z.string().optional(),
    RAZORPAY_API_KEY: z.string().trim().optional(),
    NEXT_PUBLIC_RAZORPAY_API_KEY: z.string().trim().optional(),
    RAZORPAY_TEST_API_KEY: z.string().trim().optional(),
    NEXT_PUBLIC_RAZORPAY_TEST_API_KEY: z.string().trim().optional(),
    RAZORPAY_API_SECRET: z.string().trim().optional(),
    RAZORPAY_TEST_API_SECRET: z.string().trim().optional(),
    RAZORPAY_WEBHOOK_SECRET: nonEmpty('RAZORPAY_WEBHOOK_SECRET'),
  })
  .superRefine((env, ctx) => {
    const isProd = env.NODE_ENV === 'production';
    const resolvedKeyId = isProd
      ? env.RAZORPAY_API_KEY ||
        env.NEXT_PUBLIC_RAZORPAY_API_KEY ||
        env.RAZORPAY_TEST_API_KEY ||
        env.NEXT_PUBLIC_RAZORPAY_TEST_API_KEY
      : env.RAZORPAY_TEST_API_KEY || env.NEXT_PUBLIC_RAZORPAY_TEST_API_KEY;
    const resolvedKeySecret = isProd
      ? env.RAZORPAY_API_SECRET || env.RAZORPAY_TEST_API_SECRET
      : env.RAZORPAY_TEST_API_SECRET;

    if (!resolvedKeyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RAZORPAY_API_KEY'],
        message: isProd
          ? 'Provide RAZORPAY_API_KEY (or NEXT_PUBLIC_RAZORPAY_API_KEY).'
          : 'Provide RAZORPAY_TEST_API_KEY (or NEXT_PUBLIC_RAZORPAY_TEST_API_KEY).',
      });
    }

    if (!resolvedKeySecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RAZORPAY_API_SECRET'],
        message: isProd
          ? 'Provide RAZORPAY_API_SECRET.'
          : 'Provide RAZORPAY_TEST_API_SECRET.',
      });
    }
  });

let authSecurityEnv: z.infer<typeof authSecuritySchema> | undefined;
let dataLayerEnv: z.infer<typeof dataLayerSchema> | undefined;
let qstashEnv: z.infer<typeof qstashSchema> | undefined;
let razorpayEnv: z.infer<typeof razorpaySchema> | undefined;

export function getAuthSecurityEnv() {
  authSecurityEnv ??= parseEnv('auth security', authSecuritySchema);
  return authSecurityEnv;
}

export function getDataLayerEnv() {
  dataLayerEnv ??= parseEnv('data layer', dataLayerSchema);
  return dataLayerEnv;
}

export function getQStashEnv() {
  qstashEnv ??= parseEnv('queue', qstashSchema);
  return qstashEnv;
}

export function getRazorpayEnv() {
  razorpayEnv ??= parseEnv('razorpay', razorpaySchema);
  return razorpayEnv;
}

