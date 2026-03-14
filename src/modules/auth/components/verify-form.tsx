'use client';

import { useActionState } from 'react';
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
import type { Mode, VerifyState } from '../types';
import { verifyAction, resendAction } from '../actions';

const initialState: VerifyState = {};

export function VerifyForm({
  mode,
  className,
}: {
  mode?: Mode;
  className?: string;
}) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(
    verifyAction,
    initialState,
  );

  const title = mode === 'email' ? 'Verify your email' : 'Verify your phone';
  const description =
    mode === 'email'
      ? 'Enter the code we emailed you to verify your email address.'
      : 'Enter the code we texted you to verify your phone number.';

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="pt-0">
        <CardHeader>
          <div className="mx-auto">
            <Logo />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <FieldSeparator />
        </CardHeader>

        <CardContent>
          <form action={action}>
            <input type="hidden" name="mode" value={mode} />
            <FieldSet>
              <FieldGroup>
                {/* OTP FIELD */}
                <Field>
                  <FieldLabel htmlFor="otp">Verification Code</FieldLabel>

                  <FieldContent>
                    <InputOTP
                      id="otp"
                      name="otp"
                      maxLength={6}
                      pattern="[0-9]*"
                    >
                      <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
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

                  {state.errors?.otp && (
                    <FieldError>{state.errors.otp}</FieldError>
                  )}
                </Field>

                {/* FORM ERROR */}
                {state.formError && (
                  <Field className="bg-primary/10 rounded-md p-2">
                    <FieldError>{state.formError}</FieldError>
                  </Field>
                )}

                {/* SUBMIT */}
                <Field>
                  {pending ? (
                    <SpinnerButton message="Verifying..." />
                  ) : (
                    <Button type="submit" className="w-full capitalize">
                      Verify Code
                    </Button>
                  )}
                </Field>

                {/* RESEND */}
                {resendAction && (
                  <Field>
                    <FieldDescription className="text-center">
                      Didn’t receive the code?{' '}
                      <button
                        type="button"
                        onClick={resendAction}
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Resend
                      </button>
                    </FieldDescription>
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
