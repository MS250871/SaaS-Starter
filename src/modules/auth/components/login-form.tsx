'use client';

import { SpinnerButton } from '@/components/ui/spinner-button';
import Link from 'next/link';
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
  FieldSeparator,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import type { LoginState } from '../types';
import { googleAuthAction, loginAction } from '../actions';
import type { AuthIntent } from '@/lib/auth/auth-cookies';
import { GoogleButton } from './google-button';

const initialState: LoginState = {};

export function LoginForm({
  className,
  intent,
}: {
  className?: string;
  intent: AuthIntent;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    initialState,
  );
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="pt-0">
        <CardHeader>
          <div className="mx-auto pt-6 pb-2">
            <Logo />
          </div>
          <FieldSeparator />
          <CardTitle className="text-sm md:text-lg mt-2 font-medium">
            Login to your account
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Enter your email or phone number to receive a login OTP
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={action}>
            {/* Hidden intent */}
            <input type="hidden" name="intent" value={intent} />
            <FieldSet>
              {/* GOOGLE AUTH */}
              <Field>
                <GoogleButton
                  message="Continue with Google"
                  size="default"
                  className="w-full mb-4"
                  formAction={googleAuthAction}
                />
              </Field>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <FieldGroup>
                {/* Identifier Field */}
                <Field>
                  <FieldLabel htmlFor="identifier">
                    Email or Phone Number
                  </FieldLabel>

                  <FieldContent>
                    <Input
                      id="identifier"
                      name="identifier"
                      placeholder="you@example.com or 9876543210"
                    />
                  </FieldContent>

                  {state.errors?.identifier && (
                    <FieldError>{state.errors.identifier}</FieldError>
                  )}
                </Field>

                {/* Form-level error */}
                {state.formError && (
                  <Field className="bg-primary/10 rounded-md p-2">
                    <FieldError className="text-start">
                      {state.formError}
                    </FieldError>
                  </Field>
                )}

                {/* Submit */}
                <Field>
                  {pending ? (
                    <SpinnerButton message="Sending OTP..." />
                  ) : (
                    <Button type="submit" className="w-full capitalize">
                      Continue
                    </Button>
                  )}
                </Field>

                <Field>
                  <FieldDescription className="text-center">
                    New here?{' '}
                    <Link
                      href={`/signup?intent=${intent}`}
                      className="underline underline-offset-4 hover:text-primary capitalize"
                    >
                      Create account
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{' '}
        <Link href="/terms">Terms of Service</Link> and{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </FieldDescription>
    </div>
  );
}
