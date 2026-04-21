'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupFormSchema, type SignupFormInput } from '@/modules/auth/schema';
import { signupAction } from '@/modules/auth/actions/signup.action';
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

export function SignupForm({
  intent,
  invite,
  entry,
  className,
}: {
  intent: AuthCookies['intent'];
  invite?: string;
  entry: AuthCookies['entry'];
  className?: string;
}) {
  const form = useForm<SignupFormInput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      intent,
    },
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (data: SignupFormInput) => {
    setLoading(true);
    setFormError(null);

    try {
      const formData = new FormData();

      if (invite) {
        formData.append('inviteToken', invite);
      }
      const safeEntry =
        entry === 'workspace' || entry === 'platform' ? entry : 'platform';
      formData.append('entry', safeEntry);

      Object.entries(data).forEach(([k, v]) => {
        formData.append(k, String(v));
      });

      // 🚀 navigation action (redirect happens on success)
      await signupAction(formData);
    } catch (err: unknown) {
      setLoading(false);

      const error = err as { details?: unknown; message?: string } | undefined;
      const details = error?.details;

      // ✅ map only if it's a clean field-error object
      if (details && typeof details === 'object' && !Array.isArray(details)) {
        let mapped = false;

        for (const [field, message] of Object.entries(details)) {
          if (typeof message === 'string') {
            mapped = true;

            form.setError(field as keyof SignupFormInput, {
              message,
            });
          }
        }

        if (mapped) return;
      }

      // ✅ fallback
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
            Create your account
          </CardTitle>

          <CardDescription className="text-xs md:text-sm">
            We’ll verify your email first, then your phone.
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
            <FieldSet className="gap-3">
              <FieldGroup className="gap-3 mt-3">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {/* First Name */}
                  <Field>
                    <FieldLabel>First Name</FieldLabel>
                    <FieldContent>
                      <Input {...form.register('firstName')} />
                    </FieldContent>
                    <FieldError className="text-xs">
                      {form.formState.errors.firstName?.message}
                    </FieldError>
                  </Field>

                  {/* Last Name */}
                  <Field>
                    <FieldLabel>Last Name</FieldLabel>
                    <FieldContent>
                      <Input {...form.register('lastName')} />
                    </FieldContent>
                    <FieldError className="text-xs">
                      {form.formState.errors.lastName?.message}
                    </FieldError>
                  </Field>
                </div>

                {/* Email */}
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <FieldContent>
                    <Input type="email" {...form.register('email')} />
                  </FieldContent>
                  <FieldError className="text-xs">
                    {form.formState.errors.email?.message}
                  </FieldError>
                </Field>

                {/* Phone */}
                <Field>
                  <FieldLabel>Phone</FieldLabel>
                  <FieldContent>
                    <Input {...form.register('phone')} />
                  </FieldContent>
                  <FieldError className="text-xs">
                    {form.formState.errors.phone?.message}
                  </FieldError>
                </Field>

                {/* FORM ERROR */}
                {formError && (
                  <Field>
                    <FieldError className="text-center">{formError}</FieldError>
                  </Field>
                )}

                {/* SUBMIT */}
                <Field>
                  {loading ? (
                    <SpinnerButton message="Creating your account..." />
                  ) : (
                    <Button type="submit" className="w-full">
                      Continue
                    </Button>
                  )}
                </Field>

                {/* LOGIN */}
                <Field>
                  <FieldDescription className="text-center">
                    Already have an account?{' '}
                    <Link href={`/login?intent=${intent}`}>Login here</Link>
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
