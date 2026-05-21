'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { useActionToast } from '@/hooks/use-action-toast';
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
import { Controller } from 'react-hook-form';
import { createCustomerSupportTicketAction } from '@/modules/support/actions/create-customer-support-ticket.action';
import {
  createCustomerSupportTicketActionSchema,
  type CreateCustomerSupportTicketActionInput,
} from '@/modules/support/schema';

export function CustomerSupportCreatePanel({
  basePath,
}: {
  basePath: string;
}) {
  const router = useRouter();
  const { showActionError, showActionSuccess } = useActionToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const form = useForm<CreateCustomerSupportTicketActionInput>({
    resolver: zodResolver(createCustomerSupportTicketActionSchema),
    defaultValues: {
      title: '',
      body: '',
      priority: 'medium',
    },
  });

  const onSubmit = async (data: CreateCustomerSupportTicketActionInput) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      attachmentFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await createCustomerSupportTicketAction(formData);

      if (!response.success) {
        showActionError(response.error);
        setIsSubmitting(false);
        return;
      }

      showActionSuccess(response.data.successMessage, 'Support ticket created.');
      setAttachmentFiles([]);
      setFileInputKey((current) => current + 1);
      form.reset({
        title: '',
        body: '',
        priority: 'medium',
      });
      router.replace(`${basePath}/support`);
    } catch (submitError) {
      showActionError(
        submitError instanceof Error
          ? { message: submitError.message }
          : { message: 'Unable to create ticket' },
      );
      setIsSubmitting(false);
    }
  };

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Open Support Ticket</CardTitle>
          <CardDescription>
            Share the issue, attach screenshots if helpful, and the workspace
            support desk will continue the thread with you here.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Title</FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="Summarize the issue"
                    disabled={isSubmitting}
                    {...form.register('title')}
                  />
                </FieldContent>
                <FieldError>{form.formState.errors.title?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Priority</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <Select
                        disabled={isSubmitting}
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

              <Field>
                <FieldLabel>Details</FieldLabel>
                <FieldContent>
                  <Textarea
                    placeholder="Describe what happened, what you expected, and any steps already tried."
                    disabled={isSubmitting}
                    {...form.register('body')}
                  />
                </FieldContent>
                <FieldDescription>
                  This creates a workspace-owned support ticket. Status and
                  assignment stay with the workspace support desk, and you can
                  continue the conversation from the thread.
                </FieldDescription>
                <FieldError>{form.formState.errors.body?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Attachments</FieldLabel>
                <FieldContent>
                  <Input
                    key={fileInputKey}
                    disabled={isSubmitting}
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

              <Field>
                {isSubmitting ? (
                  <div className="flex">
                    <SpinnerButton message="Creating ticket..." />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit">Create Ticket</Button>
                    <Button asChild variant="outline">
                      <Link href={`${basePath}/support`}>Back to Support</Link>
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
