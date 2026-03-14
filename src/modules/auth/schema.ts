import { z } from 'zod';

export const emailSchema = z.email();
export const phoneSchema = z
  .string()
  .regex(/^\d{10,15}$/, 'Invalid phone number');

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Enter email or phone number')
    .refine(
      (val) =>
        emailSchema.safeParse(val).success ||
        phoneSchema.safeParse(val).success,
      { message: 'Enter a valid email or phone number' },
    ),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  firstName: z.string().min(2, 'First name too short'),
  lastName: z.string().min(2, 'Last name too short'),
  email: z.email('Invalid email'),
  phone: z.string().regex(/^\d{10,15}$/, 'Invalid phone number'),
});

export type SignupSchema = z.infer<typeof signupSchema>;

export const otpSchema = z.object({
  otp: z.string().length(6).regex(/^\d+$/),
});

export type OtpSchema = z.infer<typeof otpSchema>;
