'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import { useActionToast } from '@/hooks/use-action-toast';
import { createWorkspaceSupportTicketAction } from '@/modules/support/actions/create-workspace-support-ticket.action';
import {
  createWorkspaceSupportTicketActionSchema,
  type CreateWorkspaceSupportTicketActionInput,
} from '@/modules/support/schema';

export function WorkspaceSupportCreatePanel({
  basePath,
  canCreateTicket,
  defaultTarget,
  customerOptions,
}: {
  basePath: string;
  canCreateTicket: boolean;
  defaultTarget: 'customer' | 'platform';
  customerOptions: Array<{
    id: string;
    name: string;
    email: string | null;
  }>;
}) {
  const router = useRouter();
  const { showActionSuccess } = useActionToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const form = useForm<CreateWorkspaceSupportTicketActionInput>({
    resolver: zodResolver(createWorkspaceSupportTicketActionSchema),
    defaultValues: {
      target: defaultTarget,
      customerId: '',
      title: '',
      body: '',
      priority: 'medium',
    },
  });

  const onSubmit = async (data: CreateWorkspaceSupportTicketActionInput) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      attachmentFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await createWorkspaceSupportTicketAction(formData);

      if (!response.success) {
        setError(response.error.message);
        setIsSubmitting(false);
        return;
      }

      showActionSuccess(
        response.data.successMessage,
        response.data.contextType === 'PLATFORM'
          ? 'Redirecting to platform escalations.'
          : 'Redirecting to support queue.',
      );
      setAttachmentFiles([]);
      setFileInputKey((current) => current + 1);
      form.reset({
        target: data.target,
        customerId: data.target === 'customer' ? data.customerId ?? '' : '',
        title: '',
        body: '',
        priority: 'medium',
      });
      router.replace(
        response.data.contextType === 'PLATFORM'
          ? `${basePath}/support/escalations`
          : `${basePath}/support`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create ticket',
      );
      setIsSubmitting(false);
    }
  };

  const currentTarget = useWatch({
    control: form.control,
    name: 'target',
  });
  const selectedCustomerId = useWatch({
    control: form.control,
    name: 'customerId',
  });
  const requiresCustomer = currentTarget === 'customer';
  const backHref =
    currentTarget === 'platform'
      ? `${basePath}/support/escalations`
      : `${basePath}/support`;

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Create Support Ticket</CardTitle>
        </CardHeader>
      </Card>

      <Card className="workspace-info-card border bg-background/85">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <div
                className={
                  requiresCustomer
                    ? 'grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1.3fr_0.8fr]'
                    : 'grid gap-4 xl:grid-cols-[0.9fr_1.5fr_0.8fr]'
                }
              >
                <Field>
                  <FieldLabel>Destination</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="target"
                      render={({ field }) => (
                        <Select
                          disabled={!canCreateTicket || isSubmitting}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">
                              Customer support ticket
                            </SelectItem>
                            <SelectItem value="platform">
                              Platform escalation
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder={
                        requiresCustomer
                          ? 'Summarize the customer issue'
                          : 'Summarize the escalation'
                      }
                      disabled={!canCreateTicket || isSubmitting}
                      {...form.register('title')}
                    />
                  </FieldContent>
                  <FieldError>{form.formState.errors.title?.message}</FieldError>
                </Field>

                {requiresCustomer ? (
                  <Field>
                    <FieldLabel>Customer</FieldLabel>
                    <FieldContent>
                      <Controller
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <Select
                            disabled={
                              !canCreateTicket ||
                              isSubmitting ||
                              customerOptions.length === 0
                            }
                            onValueChange={field.onChange}
                            value={field.value ?? ''}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customerOptions.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name}
                                  {customer.email ? ` (${customer.email})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FieldContent>
                    <FieldError>{form.formState.errors.customerId?.message}</FieldError>
                  </Field>
                ) : null}

                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <Select
                          disabled={!canCreateTicket || isSubmitting}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel>Details</FieldLabel>
                <FieldContent>
                  <Textarea
                    placeholder={
                      requiresCustomer
                        ? 'Describe the customer issue, impact, and any steps already tried.'
                        : 'Describe the platform issue, impact, and any steps already tried.'
                    }
                    disabled={!canCreateTicket || isSubmitting}
                    {...form.register('body')}
                  />
                </FieldContent>
                <FieldError>{form.formState.errors.body?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Attachments</FieldLabel>
                <FieldContent>
                  <Input
                    key={fileInputKey}
                    disabled={!canCreateTicket || isSubmitting}
                    multiple
                    onChange={(event) => {
                      setAttachmentFiles(Array.from(event.target.files ?? []));
                    }}
                    type="file"
                  />
                </FieldContent>
              </Field>

              {attachmentFiles.length > 0 && (
                <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                  {attachmentFiles.map((file) => file.name).join(', ')}
                </div>
              )}

              {requiresCustomer && customerOptions.length === 0 && (
                <Alert>
                  <AlertTitle>No customers available</AlertTitle>
                  <AlertDescription>
                    Add a customer first before logging a support ticket on their behalf.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Unable to create ticket</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!canCreateTicket && (
                <Alert>
                  <AlertTitle>Read-only access</AlertTitle>
                  <AlertDescription>
                    Creating tickets requires the <code>supportTicket.create</code> permission.
                  </AlertDescription>
                </Alert>
              )}

              <Field>
                {isSubmitting ? (
                  <div className="flex">
                    <SpinnerButton message="Creating ticket..." />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      disabled={
                        !canCreateTicket ||
                        (requiresCustomer &&
                          (customerOptions.length === 0 || !selectedCustomerId))
                      }
                    >
                      Create Ticket
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={backHref}>Back to Support</Link>
                    </Button>
                  </div>
                )}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
