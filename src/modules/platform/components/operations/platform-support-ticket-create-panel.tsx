'use client';

import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { SendIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { createPlatformSupportTicketAction } from '@/modules/support/actions/platform-support-admin.actions';
import {
  createPlatformSupportTicketActionSchema,
  type CreatePlatformSupportTicketActionInput,
} from '@/modules/support/schema';

export function PlatformSupportTicketCreatePanel({
  workspaceOptions,
  canCreate,
}: {
  workspaceOptions: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  }>;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const form = useForm<CreatePlatformSupportTicketActionInput>({
    resolver: zodResolver(createPlatformSupportTicketActionSchema),
    defaultValues: {
      workspaceId: workspaceOptions[0]?.id ?? '',
      title: '',
      body: '',
      priority: 'medium',
    },
  });

  const onSubmit = (data: CreatePlatformSupportTicketActionInput) => {
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

      const response = await createPlatformSupportTicketAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      setMessage(response.data.successMessage);
      setAttachmentFiles([]);
      setFileInputKey((current) => current + 1);
      form.reset({
        workspaceId: data.workspaceId,
        title: '',
        body: '',
        priority: 'medium',
      });
      router.refresh();
    });
  };

  return (
    <Card className="border-border/70 bg-background/85">
      <CardHeader>
        <CardTitle>Raise Platform Escalation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1.5fr_0.8fr]">
              <Field>
                <FieldLabel>Workspace</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="workspaceId"
                    render={({ field }) => (
                      <Select
                        disabled={!canCreate || isPending || workspaceOptions.length === 0}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a workspace" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspaceOptions.map((workspace) => (
                            <SelectItem key={workspace.id} value={workspace.id}>
                              {workspace.name} ({workspace.slug})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldContent>
                <FieldError>{form.formState.errors.workspaceId?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Title</FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="Summarize the workspace issue"
                    disabled={!canCreate || isPending}
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
                        disabled={!canCreate || isPending}
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
                  placeholder="Capture the workspace issue, operator observations, and any steps already taken."
                  disabled={!canCreate || isPending}
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
                  disabled={!canCreate || isPending}
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

            {workspaceOptions.length === 0 && (
              <Alert>
                <AlertTitle>No workspaces available</AlertTitle>
                <AlertDescription>
                  A workspace is required before platform support can log an escalation.
                </AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <SendIcon className="size-4" />
                <AlertTitle>Escalation created</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Unable to create escalation</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!canCreate && (
              <Alert>
                <AlertTitle>Read-only access</AlertTitle>
                <AlertDescription>
                  Creating escalations requires platform support management access.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex">
              {isPending ? (
                <SpinnerButton message="Creating escalation..." />
              ) : (
                <Button
                  type="submit"
                  disabled={!canCreate || workspaceOptions.length === 0}
                >
                  Create Escalation
                </Button>
              )}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
