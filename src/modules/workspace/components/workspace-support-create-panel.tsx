'use client';

import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SendIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { createWorkspaceSupportTicketAction } from '@/modules/workspace/actions/create-workspace-support-ticket.action';
import {
  createWorkspaceSupportTicketActionSchema,
  type CreateWorkspaceSupportTicketActionInput,
} from '@/modules/workspace/schema';

export function WorkspaceSupportCreatePanel({
  basePath,
  canCreateTicket,
}: {
  basePath: string;
  canCreateTicket: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const form = useForm<CreateWorkspaceSupportTicketActionInput>({
    resolver: zodResolver(createWorkspaceSupportTicketActionSchema),
    defaultValues: {
      target: 'workspace',
      title: '',
      body: '',
      priority: 'medium',
    },
  });

  const onSubmit = (data: CreateWorkspaceSupportTicketActionInput) => {
    setMessage(null);
    setError(null);

    startTransition(async () => {
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
        return;
      }

      setMessage(response.data.successMessage);
      setAttachmentFiles([]);
      setFileInputKey((current) => current + 1);
      router.push(
        response.data.contextType === 'PLATFORM'
          ? `${basePath}/support/escalations`
          : `${basePath}/support`,
      );
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Create Support Ticket</CardTitle>
          <CardDescription>
            Open a customer support ticket for your workspace or raise a platform
            escalation for the SaaS operator.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Destination</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="target"
                    render={({ field }) => (
                      <Select
                        disabled={!canCreateTicket || isPending}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="workspace">
                            Workspace customer support
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
                    placeholder="Summarize the issue"
                    disabled={!canCreateTicket || isPending}
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
                        disabled={!canCreateTicket || isPending}
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
                    placeholder="Describe the issue, customer impact, and any steps already tried."
                    disabled={!canCreateTicket || isPending}
                    {...form.register('body')}
                  />
                </FieldContent>
                <FieldDescription>
                  Customer support tickets stay with your workspace support desk.
                  Platform escalations are for SaaS-operator help requests.
                </FieldDescription>
                <FieldError>{form.formState.errors.body?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Attachments</FieldLabel>
                <FieldContent>
                  <Input
                    key={fileInputKey}
                    disabled={!canCreateTicket || isPending}
                    multiple
                    onChange={(event) => {
                      setAttachmentFiles(Array.from(event.target.files ?? []));
                    }}
                    type="file"
                  />
                </FieldContent>
                <FieldDescription>
                  Add screenshots, documents, or customer evidence when it helps
                  explain the issue.
                </FieldDescription>
              </Field>

              {attachmentFiles.length > 0 && (
                <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                  {attachmentFiles.map((file) => file.name).join(', ')}
                </div>
              )}

              {message && (
                <Alert>
                  <SendIcon className="size-4" />
                  <AlertTitle>Ticket created</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Unable to create ticket</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!canCreateTicket && (
                <Field>
                  <FieldDescription>
                    Creating tickets requires the `supportTicket.create`
                    permission.
                  </FieldDescription>
                </Field>
              )}

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message="Creating ticket..."
                  />
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={!canCreateTicket}>
                      Create Ticket
                    </Button>
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
