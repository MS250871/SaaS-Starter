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
import {
  markAllWorkspaceNotificationsReadAction,
} from '@/modules/workspace/actions/mark-all-workspace-notifications-read.action';
import { markWorkspaceNotificationReadAction } from '@/modules/workspace/actions/mark-workspace-notification-read.action';
import { sendWorkspaceNotificationAction } from '@/modules/workspace/actions/send-workspace-notification.action';
import {
  sendWorkspaceNotificationActionSchema,
  type SendWorkspaceNotificationActionInput,
} from '@/modules/workspace/schema';

type WorkspaceNotificationRecipient = {
  id: string;
  name: string;
  email: string | null;
};

type WorkspaceInboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  href: string | null;
  deliveries: Array<{
    id: string;
    channel: string;
    status: string;
    recipient: string;
    subject: string | null;
    errorMessage: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Calcutta',
  }).format(new Date(value));
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="workspace-info-card border bg-background/85">
      <CardHeader className="gap-2">
        <p className="workspace-info-label text-sm font-medium">{label}</p>
        <CardTitle className="workspace-info-value text-2xl font-semibold">
          {value}
        </CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function WorkspaceNotificationsPanel({
  inboxNotifications,
  inboxSummary,
  workspaceRecipients,
  customerRecipients,
  canCreate,
}: {
  inboxNotifications: WorkspaceInboxNotification[];
  inboxSummary: {
    totalCount: number;
    unreadCount: number;
  };
  workspaceRecipients: WorkspaceNotificationRecipient[];
  customerRecipients: WorkspaceNotificationRecipient[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const form = useForm<SendWorkspaceNotificationActionInput>({
    resolver: zodResolver(sendWorkspaceNotificationActionSchema),
    defaultValues: {
      audience: 'workspace',
      deliveryChannel: 'IN_APP',
      recipientMode: 'all',
      recipientId: '',
      title: '',
      body: '',
    },
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

  const recipientOptions = useMemo(
    () => (audience === 'customer' ? customerRecipients : workspaceRecipients),
    [audience, customerRecipients, workspaceRecipients],
  );

  async function onSubmit(values: SendWorkspaceNotificationActionInput) {
    setMessage(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('audience', values.audience);
      formData.set('deliveryChannel', values.deliveryChannel);
      formData.set('recipientMode', values.recipientMode);
      formData.set('recipientId', values.recipientId ?? '');
      formData.set('title', values.title);
      formData.set('body', values.body);

      const response = await sendWorkspaceNotificationAction(formData);

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
  }

  function handleMarkRead(notificationId: string) {
    setMessage(null);
    setMarkingId(notificationId);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('notificationId', notificationId);

      const response = await markWorkspaceNotificationReadAction(formData);
      setMarkingId(null);

      if (!response.success) {
        setMessage(response.error.message);
        return;
      }

      router.refresh();
    });
  }

  function handleMarkAllRead() {
    setMessage(null);

    startTransition(async () => {
      const response = await markAllWorkspaceNotificationsReadAction();

      if (!response.success) {
        setMessage(response.error.message);
        return;
      }

      setMessage(response.data.successMessage);
      router.refresh();
    });
  }

  return (
    <section className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="My Inbox"
          value={inboxSummary.totalCount}
          detail="Notifications recorded for your workspace session."
        />
        <InfoCard
          label="Unread"
          value={inboxSummary.unreadCount}
          detail="Items still waiting for you to review."
        />
        <InfoCard
          label="Workspace Members"
          value={workspaceRecipients.length}
          detail="Available internal recipients for team notifications."
        />
        <InfoCard
          label="Customers"
          value={customerRecipients.length}
          detail="Available recipients for customer notifications."
        />
      </section>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>
            Send a workspace or customer notification from the admin surface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <Alert>
              <BellIcon className="size-4 text-accent" />
              <AlertTitle>Notification update</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup className="gap-4">
              <div
                className={cn(
                  'grid gap-4',
                  recipientMode === 'single' ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
                )}
              >
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
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a recipient" />
                            </SelectTrigger>
                            <SelectContent>
                              {recipientOptions.map((recipient) => (
                                <SelectItem key={recipient.id} value={recipient.id}>
                                  {recipient.name}
                                  {recipient.email ? ` (${recipient.email})` : ''}
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

              {!canCreate ? (
                <Alert>
                  <MailIcon className="size-4 text-accent" />
                  <AlertTitle>Notifications are view-only</AlertTitle>
                  <AlertDescription>
                    Sending notifications requires the <code>notification.create</code>{' '}
                    permission.
                  </AlertDescription>
                </Alert>
              ) : null}

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
                  <Button type="submit" disabled={!canCreate}>
                    <SendIcon className="size-4" />
                    Send Notification
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">
                  {deliveryChannel === 'EMAIL'
                    ? 'Email deliveries are processed through the notification engine.'
                    : 'In-app notifications appear directly in the recipient inbox.'}
                </p>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>My Inbox</CardTitle>
            <CardDescription>
              Your recent workspace notifications with quick read controls.
            </CardDescription>
          </div>
          {inboxSummary.unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={isPending}
              onClick={handleMarkAllRead}
            >
              Mark All Read
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {inboxNotifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              Your inbox is empty right now.
            </div>
          ) : (
            inboxNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'rounded-2xl border px-4 py-4',
                  notification.isRead
                    ? 'border-border/70 bg-background'
                    : 'border-accent/40 bg-background'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{notification.title}</p>
                      {!notification.isRead ? (
                        <Badge variant="secondary">Unread</Badge>
                      ) : null}
                      {notification.deliveries
                        .filter((delivery) => delivery.channel !== 'IN_APP')
                        .map((delivery) => (
                          <Badge key={delivery.id} variant="secondary">
                            {delivery.channel.toLowerCase()} ·{' '}
                            {delivery.status.toLowerCase().replace(/_/g, ' ')}
                          </Badge>
                        ))}
                    </div>
                    {notification.body ? (
                      <p className="text-sm leading-6 text-muted-foreground">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      disabled={isPending && markingId === notification.id}
                      onClick={() => handleMarkRead(notification.id)}
                    >
                      Mark Read
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
