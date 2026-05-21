'use client';

import { useMemo, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { BellIcon, MailIcon, SendIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { sendPlatformWorkspaceNotificationAction } from '@/modules/notifications/actions/platform-notification-admin.actions';
import {
  sendPlatformWorkspaceNotificationActionSchema,
  type SendPlatformWorkspaceNotificationActionInput,
} from '@/modules/notifications/schema';
import type {
  PlatformNotificationRecipientOption,
  PlatformNotificationWorkspaceOption,
} from '@/modules/notifications/server/platform-notifications-admin-page-data';

export function PlatformNotificationSendPanel({
  workspaceOptions,
  workspaceRecipients,
  customerRecipients,
}: {
  workspaceOptions: PlatformNotificationWorkspaceOption[];
  workspaceRecipients: PlatformNotificationRecipientOption[];
  customerRecipients: PlatformNotificationRecipientOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<SendPlatformWorkspaceNotificationActionInput>({
    resolver: zodResolver(sendPlatformWorkspaceNotificationActionSchema),
    defaultValues: {
      workspaceId: workspaceOptions[0]?.id ?? '',
      audience: 'workspace',
      deliveryChannel: 'IN_APP',
      recipientMode: 'all',
      recipientId: '',
      title: '',
      body: '',
    },
  });

  const workspaceId = useWatch({
    control: form.control,
    name: 'workspaceId',
  });
  const audience = useWatch({
    control: form.control,
    name: 'audience',
  });
  const recipientMode = useWatch({
    control: form.control,
    name: 'recipientMode',
  });
  const deliveryChannel = useWatch({
    control: form.control,
    name: 'deliveryChannel',
  });

  const selectedWorkspace = useMemo(
    () => workspaceOptions.find((workspace) => workspace.id === workspaceId) ?? null,
    [workspaceId, workspaceOptions],
  );
  const recipientOptions = useMemo(() => {
    const source = audience === 'customer' ? customerRecipients : workspaceRecipients;

    return source.filter((recipient) => recipient.workspaceId === workspaceId);
  }, [audience, customerRecipients, workspaceId, workspaceRecipients]);

  const onSubmit = (values: SendPlatformWorkspaceNotificationActionInput) => {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('workspaceId', values.workspaceId);
      formData.set('audience', values.audience);
      formData.set('deliveryChannel', values.deliveryChannel);
      formData.set('recipientMode', values.recipientMode);
      formData.set('recipientId', values.recipientId ?? '');
      formData.set('title', values.title);
      formData.set('body', values.body);

      const response = await sendPlatformWorkspaceNotificationAction(formData);

      if (!response.success) {
        setMessage(response.error.message);
        return;
      }

      setMessage(response.data.successMessage);
      form.reset({
        ...values,
        title: '',
        body: '',
        recipientId: values.recipientMode === 'single' ? values.recipientId : '',
      });
      router.refresh();
    });
  };

  return (
    <Card className="border-border/70 bg-background/85">
      <CardHeader>
        <CardTitle>Raise Workspace Notification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <Alert>
            <BellIcon className="size-4 text-accent" />
            <AlertTitle>Notification update</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {workspaceOptions.length === 0 ? (
          <Alert>
            <MailIcon className="size-4 text-accent" />
            <AlertTitle>No workspaces available</AlertTitle>
            <AlertDescription>
              Create or activate a workspace before publishing notifications from
              the platform operations surface.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup className="gap-4">
              <div
                className={cn(
                  'grid gap-4',
                  recipientMode === 'single'
                    ? 'xl:grid-cols-5'
                    : 'xl:grid-cols-4',
                )}
              >
                <Field>
                  <FieldLabel>Workspace</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="workspaceId"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('recipientId', '');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select workspace" />
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
                  <FieldError>
                    {form.formState.errors.workspaceId?.message}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel>Audience</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="audience"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('recipientId', '');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="workspace">Workspace Members</SelectItem>
                            <SelectItem value="customer">Customers</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                  <FieldError>{form.formState.errors.audience?.message}</FieldError>
                </Field>

                <Field>
                  <FieldLabel>Delivery</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="deliveryChannel"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select delivery" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN_APP">In-App</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.deliveryChannel?.message}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel>Recipients</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={form.control}
                      name="recipientMode"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('recipientId', '');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose recipients" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="single">Single Recipient</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.recipientMode?.message}
                  </FieldError>
                </Field>

                {recipientMode === 'single' ? (
                  <Field>
                    <FieldLabel>Recipient</FieldLabel>
                    <FieldContent>
                      <Controller
                        control={form.control}
                        name="recipientId"
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a recipient" />
                            </SelectTrigger>
                            <SelectContent>
                              {recipientOptions.map((recipient) => (
                                <SelectItem key={recipient.id} value={recipient.id}>
                                  {recipient.name}
                                  {recipient.email ? ` (${recipient.email})` : ''}
                                  {recipient.subLabel ? ` - ${recipient.subLabel}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FieldContent>
                    <FieldError>
                      {form.formState.errors.recipientId?.message}
                    </FieldError>
                  </Field>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {selectedWorkspace ? (
                  <>
                    <Badge variant={selectedWorkspace.isActive ? 'secondary' : 'outline'}>
                      {selectedWorkspace.isActive ? 'Active workspace' : 'Inactive workspace'}
                    </Badge>
                    <span>
                      {recipientOptions.length} eligible{' '}
                      {audience === 'customer' ? 'customer' : 'workspace member'}
                      {recipientOptions.length === 1 ? '' : 's'} for the current filter.
                    </span>
                  </>
                ) : (
                  <span>Select a workspace to load recipients.</span>
                )}
              </div>

              <div className="grid gap-4">
                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <FieldContent>
                    <Input {...form.register('title')} placeholder="Notification title" />
                  </FieldContent>
                  <FieldError>{form.formState.errors.title?.message}</FieldError>
                </Field>

                <Field>
                  <FieldLabel>Message</FieldLabel>
                  <FieldContent>
                    <Textarea
                      {...form.register('body')}
                      rows={5}
                      placeholder="Write the notification message"
                    />
                  </FieldContent>
                  <FieldError>{form.formState.errors.body?.message}</FieldError>
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isPending ? (
                  <SpinnerButton
                    message={
                      deliveryChannel === 'EMAIL'
                        ? 'Sending notification...'
                        : 'Publishing notification...'
                    }
                  />
                ) : (
                  <Button
                    type="submit"
                    disabled={!selectedWorkspace || workspaceOptions.length === 0}
                  >
                    <SendIcon className="size-4" />
                    Send Notification
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">
                  {deliveryChannel === 'EMAIL'
                    ? 'Email deliveries are queued through the notification engine.'
                    : 'In-app notifications appear directly in the recipient inbox.'}
                </p>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
