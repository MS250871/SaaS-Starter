import { z } from 'zod';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { normalizePhone } from '@/lib/auth/auth-utils';

/* =========================================================
   Constants
========================================================= */

const DEFAULT_COUNTRY: CountryCode = 'IN';

/* =========================================================
   Helpers
========================================================= */

const trim = (val: string) => val.trim();

const toLower = (val: string) => val.toLowerCase();

const capitalize = (val: string) =>
  val.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function toE164(phone: string, country: CountryCode = DEFAULT_COUNTRY) {
  const parsed = parsePhoneNumberFromString(phone, country);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/* =========================================================
   Base Validators (reusable)
========================================================= */

export const emailSchema = z.email('Invalid email');

export const phoneSchemaStrict = z
  .string()
  .min(6, 'Phone number too short')
  .max(16, 'Phone number too long')
  .refine((val) => normalizePhone(val).valid, {
    message: 'Enter a valid phone number',
  });

/* =========================================================
   LOGIN
========================================================= */

// ---------- FORM SCHEMA (UI) ----------

export const loginFormSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Enter email or phone number')
    .refine(
      (val) => {
        const identifierRaw = trim(val).replace(/\s+/g, '');

        // ✅ email check
        if (emailSchema.safeParse(identifierRaw).success) return true;

        // ✅ phone check (centralized)
        return normalizePhone(identifierRaw).valid;
      },
      {
        message: 'Enter a valid email or phone number',
      },
    ),

  intent: z.enum(['free', 'paid']),
});

export type LoginFormInput = z.input<typeof loginFormSchema>;

// ---------- DOMAIN SCHEMA (normalized) ----------
export const loginSchema = loginFormSchema.transform((data) => {
  const identifierRaw = trim(data.identifier).replace(/\s+/g, '');

  // ✅ email
  if (emailSchema.safeParse(identifierRaw).success) {
    return {
      ...data,
      identifier: toLower(identifierRaw),
    };
  }

  // ✅ phone (safe because already validated)
  const { e164 } = normalizePhone(identifierRaw);

  return {
    ...data,
    identifier: e164!,
  };
});

export type LoginDomain = z.output<typeof loginSchema>;

/* =========================================================
   SIGNUP
========================================================= */

// ---------- FORM SCHEMA (UI) ----------
export const signupFormSchema = z.object({
  firstName: z.string().min(2, 'First name too short'),
  lastName: z.string().min(2, 'Last name too short'),
  email: emailSchema,
  phone: phoneSchemaStrict,
  intent: z.enum(['free', 'paid']),
  inviteToken: z.string().optional(),
});

export type SignupFormInput = z.input<typeof signupFormSchema>;

// ---------- DOMAIN SCHEMA (normalized) ----------
export const signupSchema = signupFormSchema.transform((data) => {
  const firstName = capitalize(trim(data.firstName));
  const lastName = capitalize(trim(data.lastName));
  const email = toLower(trim(data.email));
  const { e164 } = normalizePhone(data.phone);

  return {
    ...data,
    firstName,
    lastName,
    email,
    phone: e164!, // E.164 here
  };
});

export type SignupDomain = z.output<typeof signupSchema>;

/* =========================================================
   OTP (no domain split needed)
========================================================= */

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d+$/, 'Invalid OTP'),

  mode: z.enum(['email', 'phone']),
});

export type OtpSchema = z.infer<typeof otpSchema>;
