'use client';

import { useActionState } from 'react';
import { signupAction } from '@/modules/auth/actions';
import { SignupState } from '../types';
import { SpinnerButton } from '@/components/ui/spinner-button';
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
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import type { AuthIntent } from '@/lib/auth/auth-cookies';

const initialState: SignupState = {};

export function SignupForm({
  intent,
  className,
}: {
  intent: AuthIntent;
  className?: string;
}) {
  const [state, action, pending] = useActionState<SignupState, FormData>(
    signupAction,
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
            Create your account
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            We’ll verify your email first, then your phone to keep your account
            secure.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={action}>
            <input type="hidden" name="intent" value={intent} />
            <FieldSet className="gap-3">
              <FieldGroup className="gap-3">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {/* First Name */}
                  <Field>
                    <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                    <FieldContent>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                      />
                    </FieldContent>
                    {state.errors?.firstName && (
                      <FieldError>{state.errors.firstName}</FieldError>
                    )}
                  </Field>

                  {/* Last Name */}
                  <Field>
                    <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                    <FieldContent>
                      <Input id="lastName" name="lastName" placeholder="Doe" />
                    </FieldContent>
                    {state.errors?.lastName && (
                      <FieldError>{state.errors.lastName}</FieldError>
                    )}
                  </Field>
                </div>

                {/* Email */}
                <Field>
                  <FieldLabel htmlFor="email">Email Address</FieldLabel>
                  <FieldContent>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                    />
                  </FieldContent>

                  {state.errors?.email && (
                    <FieldError>{state.errors.email}</FieldError>
                  )}
                </Field>

                {/* Phone */}
                <Field>
                  <FieldLabel htmlFor="phone">Mobile Number</FieldLabel>
                  <FieldContent>
                    <Input id="phone" name="phone" placeholder="9876543210" />
                  </FieldContent>

                  {state.errors?.phone && (
                    <FieldError>{state.errors.phone}</FieldError>
                  )}
                </Field>

                {/* Form-level error */}
                {state.formError && (
                  <Field>
                    <FieldError className="text-center">
                      {state.formError}
                    </FieldError>
                  </Field>
                )}

                {/* Submit */}
                <Field>
                  {pending ? (
                    <SpinnerButton message="Creating your account..." />
                  ) : (
                    <Button type="submit" className="w-full capitalize">
                      Continue
                    </Button>
                  )}
                </Field>

                {/* Switch to Login */}
                <Field>
                  <FieldDescription className="text-center">
                    Already have an account?{' '}
                    <Link
                      href={`/login?intent=${intent}`}
                      className="underline underline-offset-4 hover:text-primary capitalize"
                    >
                      Login here
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
