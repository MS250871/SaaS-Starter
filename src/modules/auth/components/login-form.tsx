'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginFormSchema, type LoginFormInput } from '@/modules/auth/schema';
import { loginAction } from '@/modules/auth/actions/login.action';
import { googleAuthAction } from '@/modules/auth/actions/google-auth.action';
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
import { GoogleButton } from './google-button';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import type { AuthCookies } from '@/lib/auth/auth.schema';
import { useState } from 'react';
import { isNextRedirectError } from '@/lib/http/is-next-redirect-error';

export function LoginForm({
  className,
  intent,
  message,
}: {
  className?: string;
  intent: AuthCookies['intent'];
  message?: string;
}) {
  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: '',
      intent,
    },
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (data: LoginFormInput) => {
    setLoading(true);
    setFormError(null);

    try {
      const formData = new FormData();

      Object.entries(data).forEach(([k, v]) => {
        formData.append(k, String(v));
      });

      await loginAction(formData);
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

            form.setError(field as keyof LoginFormInput, {
              message,
            });
          }
        }

        if (mapped) return;
      }

      setFormError(error?.message || 'Something went wrong');
    }
  };

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
          {/* GOOGLE */}
          <Field>
            <GoogleButton
              message="Continue with Google"
              size="default"
              className="w-full mb-4"
              onClick={async () => {
                await googleAuthAction();
              }}
            />
          </Field>

          <FieldSeparator className="my-2">Or continue with</FieldSeparator>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldSet>
              <FieldGroup>
                {message && (
                  <Field className="bg-amber-100/70 p-2 rounded-lg border border-amber-300">
                    <FieldDescription className="text-center text-amber-900">
                      {message}
                    </FieldDescription>
                  </Field>
                )}

                {/* Identifier */}
                <Field>
                  <FieldLabel>Email or Phone Number</FieldLabel>

                  <FieldContent>
                    <Input
                      placeholder="you@example.com or 9876543210"
                      {...form.register('identifier')}
                    />
                  </FieldContent>

                  <FieldError>
                    {form.formState.errors.identifier?.message}
                  </FieldError>
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
                    <SpinnerButton message="Sending OTP..." />
                  ) : (
                    <Button type="submit" className="w-full">
                      Continue
                    </Button>
                  )}
                </Field>

                {/* SIGNUP */}
                <Field>
                  <FieldDescription className="text-center">
                    New here?{' '}
                    <Link href={`/signup?intent=${intent}`}>
                      Create account
                    </Link>
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
