'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { otpSchema, type OtpSchema } from '@/modules/auth/schema';
import { verifyAction, resendAction } from '../actions';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldSeparator,
} from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useState, useEffect } from 'react';

type Mode = 'email' | 'phone';

const RESEND_COOLDOWN = 30; // seconds

export function VerifyForm({
  mode,
  className,
}: {
  mode?: Mode;
  className?: string;
}) {
  const form = useForm<OtpSchema>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
      mode: mode ?? 'email',
    },
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [isCooldownActive, setIsCooldownActive] = useState(true);

  /* ---------------- COUNTDOWN TIMER ---------------- */
  useEffect(() => {
    if (!isCooldownActive) return;

    if (cooldown <= 0) {
      setIsCooldownActive(false);
      return;
    }

    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown, isCooldownActive]);

  /* ---------------- VERIFY ---------------- */
  const onSubmit = async (data: OtpSchema) => {
    setLoading(true);
    setFormError(null);

    try {
      const formData = new FormData();

      Object.entries(data).forEach(([k, v]) => {
        formData.append(k, String(v));
      });

      if (mode) {
        formData.append('mode', String(mode));
      }

      await verifyAction(formData);
    } catch (err: any) {
      setLoading(false);

      const details = err?.details;

      if (details && typeof details === 'object' && !Array.isArray(details)) {
        let mapped = false;

        for (const [field, message] of Object.entries(details)) {
          if (typeof message === 'string') {
            mapped = true;

            form.setError(field as keyof OtpSchema, {
              message,
            });
          }
        }

        if (mapped) return;
      }

      setFormError(err?.message || 'Something went wrong');
    }
  };

  /* ---------------- RESEND ---------------- */
  const handleResend = async () => {
    if (isCooldownActive) return;

    try {
      await resendAction();

      // 🔥 reset cooldown
      setCooldown(RESEND_COOLDOWN);
      setIsCooldownActive(true);
    } catch (e) {
      console.error('Resend failed', e);
    }
  };

  const formatted = cooldown.toString().padStart(2, '0');

  const title = mode === 'email' ? 'Verify your email' : 'Verify your phone';
  const description =
    mode === 'email'
      ? 'Enter the code we emailed you to verify your email address.'
      : 'Enter the code we texted you to verify your phone number.';

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="pt-0">
        <CardHeader>
          <div className="mx-auto pt-6">
            <Logo />
          </div>
          <FieldSeparator className="my-2" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldSet>
              <FieldGroup>
                {/* OTP FIELD */}
                <Field>
                  <FieldLabel>Verification Code</FieldLabel>

                  <FieldContent>
                    <InputOTP
                      maxLength={6}
                      pattern="[0-9]*"
                      value={form.watch('otp')}
                      onChange={(val) =>
                        form.setValue('otp', val, { shouldValidate: true })
                      }
                    >
                      <InputOTPGroup className="gap-3 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FieldContent>

                  <FieldDescription>
                    Enter the 6-digit code we sent you.
                  </FieldDescription>

                  <FieldError>{form.formState.errors.otp?.message}</FieldError>
                </Field>

                {/* FORM ERROR */}
                {formError && (
                  <Field className="bg-red-200/50 p-2 rounded-lg border border-red-400">
                    <FieldError className="text-center capitalize">
                      {formError}
                    </FieldError>
                  </Field>
                )}

                {/* SUBMIT */}
                <Field>
                  {loading ? (
                    <SpinnerButton message="Verifying..." />
                  ) : (
                    <Button type="submit" className="w-full capitalize">
                      Verify Code
                    </Button>
                  )}
                </Field>

                {/* RESEND */}
                <Field>
                  <FieldDescription className="text-start">
                    Didn’t receive the code?{' '}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isCooldownActive}
                      className={cn(
                        'underline underline-offset-4 hover:text-primary tabular-nums',
                        isCooldownActive && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {isCooldownActive ? `Resend in ${formatted}s` : 'Resend'}
                    </button>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
