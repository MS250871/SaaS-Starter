'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, UserPlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { createWorkspaceCustomerAction } from '@/modules/customer/actions/create-workspace-customer.action';
import {
  createWorkspaceCustomerActionSchema,
  type CreateWorkspaceCustomerActionInput,
} from '@/modules/workspace/schema';

export function WorkspaceCustomerCreatePanel({
  basePath,
}: {
  basePath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const form = useForm<CreateWorkspaceCustomerActionInput>({
    resolver: zodResolver(createWorkspaceCustomerActionSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      externalId: '',
    },
  });

  const onSubmit = (data: CreateWorkspaceCustomerActionInput) => {
    setError(null);
    setFlashMessage(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      formData.append('phone', data.phone);
      formData.append('externalId', data.externalId ?? '');

      const response = await createWorkspaceCustomerAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      setFlashMessage(response.data.successMessage);
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        externalId: '',
      });
      router.push(`${basePath}/customers/${response.data.customerId}`);
    });
  };

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Create Customer</CardTitle>
              <CardDescription className="mt-2">
                Create a customer identity, verified auth accounts, and a
                workspace customer record in one flow.
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={`${basePath}/customers`}>
                <ArrowLeftIcon className="mr-2 size-4" />
                Back to Customers
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {flashMessage && (
        <Alert>
          <AlertTitle>Updated</AlertTitle>
          <AlertDescription>{flashMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Create customer failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Customer Profile</CardTitle>
          <CardDescription>
            Email and phone will be marked as verified because this customer is
            being created by a trusted workspace admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>First Name</FieldLabel>
                  <FieldContent>
                    <Input disabled={isPending} {...form.register('firstName')} />
                  </FieldContent>
                  <FieldError>{form.formState.errors.firstName?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel>Last Name</FieldLabel>
                  <FieldContent>
                    <Input disabled={isPending} {...form.register('lastName')} />
                  </FieldContent>
                  <FieldError>{form.formState.errors.lastName?.message}</FieldError>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <FieldContent>
                    <Input
                      type="email"
                      disabled={isPending}
                      {...form.register('email')}
                    />
                  </FieldContent>
                  <FieldError>{form.formState.errors.email?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel>Phone</FieldLabel>
                  <FieldContent>
                    <Input disabled={isPending} {...form.register('phone')} />
                  </FieldContent>
                  <FieldError>{form.formState.errors.phone?.message}</FieldError>
                </Field>
              </div>

              <Field>
                <FieldLabel>External ID</FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="crm_customer_001"
                    disabled={isPending}
                    {...form.register('externalId')}
                  />
                </FieldContent>
                <FieldError>{form.formState.errors.externalId?.message}</FieldError>
              </Field>

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message="Creating customer..."
                  />
                ) : (
                  <Button type="submit">
                    <UserPlusIcon className="mr-2 size-4" />
                    Create Customer
                  </Button>
                )}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
