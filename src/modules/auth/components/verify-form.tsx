'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { otpSchema, type OtpSchema } from '@/modules/auth/schema';
import { verifyAction } from '@/modules/auth/actions/verify.action';
import { resendAction } from '@/modules/auth/actions/resend.action';
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
import { isNextRedirectError } from '@/lib/http/is-next-redirect-error';

type Mode = 'email' | 'phone';

const RESEND_COOLDOWN = 30;

export function VerifyForm({
  mode,
  className,
  workspaceSurface = false,
  hideTopBrand = false,
}: {
  mode?: Mode;
  className?: string;
  workspaceSurface?: boolean;
  hideTopBrand?: boolean;
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
  const otpValue = useWatch({
    control: form.control,
    name: 'otp',
  });
  const isCooldownActive = cooldown > 0;

  const cardClassName = workspaceSurface
    ? 'border border-[var(--workspace-accent-border-light)] bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
    : '';
  const primaryButtonClassName = workspaceSurface
    ? 'w-full bg-[var(--workspace-primary)] text-[var(--workspace-primary-foreground)] hover:opacity-95 capitalize'
    : 'w-full capitalize';
  const spinnerClassName = workspaceSurface
    ? 'w-full bg-[var(--workspace-primary)] text-[var(--workspace-primary-foreground)] hover:opacity-95'
    : 'w-full';
  const errorClassName = workspaceSurface
    ? 'rounded-xl border border-red-200 bg-red-50/90 p-3 dark:border-red-400/30 dark:bg-red-500/10'
    : 'rounded-lg border border-red-400 bg-red-200/50 p-2';

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

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
    } catch (err: unknown) {
      if (isNextRedirectError(err)) {
        throw err;
      }

      setLoading(false);

      const error = err as { details?: unknown; message?: string } | undefined;
      const details = error?.details;

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

      setFormError(error?.message || 'Something went wrong');
    }
  };

  const handleResend = async () => {
    if (isCooldownActive) return;

    try {
      await resendAction();
      setCooldown(RESEND_COOLDOWN);
    } catch (error) {
      console.error('Resend failed', error);
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
      <Card className={cardClassName}>
        <CardHeader>
          {!hideTopBrand ? (
            <>
              <div className="mx-auto">
                <Logo />
              </div>
              <FieldSeparator className="my-2" />
            </>
          ) : null}

          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel>Verification Code</FieldLabel>

                  <FieldContent>
                    <InputOTP
                      maxLength={6}
                      pattern="[0-9]*"
                      value={otpValue ?? ''}
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

                {formError ? (
                  <Field className={errorClassName}>
                    <FieldError className="text-center capitalize">
                      {formError}
                    </FieldError>
                  </Field>
                ) : null}

                <Field>
                  {loading ? (
                    <SpinnerButton
                      message="Verifying..."
                      className={spinnerClassName}
                    />
                  ) : (
                    <Button type="submit" className={primaryButtonClassName}>
                      Verify Code
                    </Button>
                  )}
                </Field>

                <Field>
                  <FieldDescription className="text-start">
                    Didn&apos;t receive the code?{' '}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isCooldownActive}
                      className={cn(
                        'tabular-nums underline underline-offset-4 hover:text-primary',
                        isCooldownActive && 'cursor-not-allowed opacity-50',
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
