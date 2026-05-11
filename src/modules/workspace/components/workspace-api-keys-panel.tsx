'use client';

import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  CopyIcon,
  KeyRoundIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import { createWorkspaceApiKeyAction } from '@/modules/workspace/actions/create-workspace-api-key.action';
import { revokeWorkspaceApiKeyAction } from '@/modules/workspace/actions/revoke-workspace-api-key.action';
import { rotateWorkspaceApiKeyAction } from '@/modules/workspace/actions/rotate-workspace-api-key.action';
import type { WorkspaceApiKeyScope } from '@/modules/workspace/api-key-scopes';
import {
  createWorkspaceApiKeyActionSchema,
  type CreateWorkspaceApiKeyActionInput,
} from '@/modules/workspace/schema';

type ApiKeyListItem = {
  id: string;
  name: string;
  keyPrefix: string | null;
  description: string | null;
  scopes: string[];
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdByName: string;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Calcutta',
  }).format(new Date(value));
}

function CopyButton({
  value,
  label = 'Copy',
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <CopyIcon className="mr-2 size-4" />
      {copied ? 'Copied' : label}
    </Button>
  );
}

function StatCard({
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

export function WorkspaceApiKeysPanel({
  apiKeys,
  availableScopes,
  apiKeySummary,
  canCreate,
  canRotate,
  canRevoke,
}: {
  apiKeys: ApiKeyListItem[];
  availableScopes: WorkspaceApiKeyScope[];
  apiKeySummary: {
    totalKeys: number;
    activeKeys: number;
    revokedKeys: number;
    expiredKeys: number;
  };
  canCreate: boolean;
  canRotate: boolean;
  canRevoke: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{
    name: string;
    value: string;
  } | null>(null);
  const defaultScopes = availableScopes.map((scope) => scope.key);

  const form = useForm<CreateWorkspaceApiKeyActionInput>({
    resolver: zodResolver(createWorkspaceApiKeyActionSchema),
    defaultValues: {
      name: '',
      description: '',
      expiresAt: '',
      scopes: defaultScopes,
    },
  });

  const onCreateApiKey = (data: CreateWorkspaceApiKeyActionInput) => {
    setFlashMessage(null);
    setError(null);
    setRevealedSecret(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description ?? '');
      formData.append('expiresAt', data.expiresAt ?? '');
      data.scopes.forEach((scope) => formData.append('scopes', scope));

      const response = await createWorkspaceApiKeyAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      setFlashMessage(response.data.successMessage);
      setRevealedSecret({
        name: response.data.name,
        value: response.data.plainTextKey,
      });
      form.reset({
        name: '',
        description: '',
        expiresAt: '',
        scopes: defaultScopes,
      });
      router.refresh();
    });
  };

  const runRotate = (apiKeyId: string) => {
    setFlashMessage(null);
    setError(null);
    setRevealedSecret(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('apiKeyId', apiKeyId);
      const response = await rotateWorkspaceApiKeyAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      setFlashMessage(response.data.successMessage);
      setRevealedSecret({
        name: response.data.name,
        value: response.data.plainTextKey,
      });
      router.refresh();
    });
  };

  const runRevoke = (apiKeyId: string) => {
    setFlashMessage(null);
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('apiKeyId', apiKeyId);
      const response = await revokeWorkspaceApiKeyAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      setFlashMessage(response.data.successMessage);
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Keys"
          value={apiKeySummary.totalKeys}
          detail="All integration keys issued for this workspace."
        />
        <StatCard
          label="Active Keys"
          value={apiKeySummary.activeKeys}
          detail="Keys currently available for integration use."
        />
        <StatCard
          label="Revoked Keys"
          value={apiKeySummary.revokedKeys}
          detail="Keys that have been manually disabled."
        />
        <StatCard
          label="Expired Keys"
          value={apiKeySummary.expiredKeys}
          detail="Keys that have passed their expiry date."
        />
      </div>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-accent" />
            <CardTitle>API Integrations</CardTitle>
          </div>
          <CardDescription>
            Create and manage bearer-token keys for your workspace integrations.
          </CardDescription>
        </CardHeader>
      </Card>

      {revealedSecret && (
        <Alert>
          <ShieldCheckIcon className="size-4" />
          <AlertTitle>Copy this secret now</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              <span className="font-medium">{revealedSecret.name}</span> has been
              issued. This is the only time the full API key will be shown.
            </p>
            <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
              <code className="break-all text-sm">{revealedSecret.value}</code>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyButton value={revealedSecret.value} label="Copy API Key" />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {flashMessage && (
        <Alert>
          <AlertTitle>Updated</AlertTitle>
          <AlertDescription>{flashMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>API key action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="grid gap-6">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
            <CardDescription>
              Issue a workspace integration key with a clear name and an
              optional expiry date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={form.handleSubmit(onCreateApiKey)}>
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="ERP Sync Production"
                        disabled={!canCreate || isPending}
                        {...form.register('name')}
                      />
                    </FieldContent>
                    <FieldError>{form.formState.errors.name?.message}</FieldError>
                  </Field>

                  <Field>
                    <FieldLabel>Expires On</FieldLabel>
                    <FieldContent>
                      <Input
                        type="date"
                        disabled={!canCreate || isPending}
                        {...form.register('expiresAt')}
                      />
                    </FieldContent>
                    <FieldError>
                      {form.formState.errors.expiresAt?.message}
                    </FieldError>
                  </Field>
                </div>

                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <FieldContent>
                    <Textarea
                      placeholder="What system will use this key and for what purpose?"
                      disabled={!canCreate || isPending}
                      {...form.register('description')}
                    />
                  </FieldContent>
                  <FieldError>
                    {form.formState.errors.description?.message}
                  </FieldError>
                </Field>

                {!canCreate && (
                  <Field>
                    <p className="text-sm text-muted-foreground">
                      Creating API keys requires the `apiKey.create` permission.
                    </p>
                  </Field>
                )}

                <Field>
                  {isPending ? (
                    <SpinnerButton
                      className="w-full sm:w-auto"
                      message="Issuing API key..."
                    />
                  ) : (
                    <Button type="submit" disabled={!canCreate}>
                      Issue API Key
                    </Button>
                  )}
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Issued Keys</CardTitle>
            <CardDescription>
              Safe metadata only. Full secrets are never shown again after
              creation or rotation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {apiKeys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-sm text-muted-foreground">
                No API keys issued yet.
              </div>
            ) : (
              apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="rounded-2xl border border-border/70 bg-muted/10 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{apiKey.name}</p>
                        <Badge
                          variant={
                            apiKey.isActive && !apiKey.isExpired
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {apiKey.isActive
                            ? apiKey.isExpired
                              ? 'Expired'
                              : 'Active'
                            : 'Revoked'}
                        </Badge>
                        {apiKey.keyPrefix && (
                          <Badge variant="outline">{apiKey.keyPrefix}...</Badge>
                        )}
                      </div>
                      {apiKey.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {apiKey.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                        <p>Created by: {apiKey.createdByName}</p>
                        <p>Created: {formatDateTime(apiKey.createdAt)}</p>
                        <p>
                          Last used:{' '}
                          {apiKey.lastUsedAt
                            ? formatDateTime(apiKey.lastUsedAt)
                            : 'Not used yet'}
                        </p>
                        <p>
                          Expires:{' '}
                          {apiKey.expiresAt
                            ? formatDateTime(apiKey.expiresAt)
                            : 'Does not expire'}
                        </p>
                        {apiKey.revokedAt && (
                          <p>Revoked: {formatDateTime(apiKey.revokedAt)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!canRotate || isPending}
                          >
                            <RefreshCcwIcon className="mr-2 size-4" />
                            Rotate
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rotate API key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will invalidate the current secret for{' '}
                              {apiKey.name}. Make sure the integration is ready
                              to receive the replacement key immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => runRotate(apiKey.id)}
                            >
                              Rotate Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!canRevoke || isPending || !apiKey.isActive}
                          >
                            <Trash2Icon className="mr-2 size-4" />
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disable {apiKey.name} immediately and
                              stop any integration using it from authenticating.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => runRevoke(apiKey.id)}
                            >
                              Revoke Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Application Instructions</CardTitle>
          <CardDescription>
            Pass the key as a bearer token from your application server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
            <pre className="overflow-x-auto text-sm">
              <code>{`Authorization: Bearer smx_ws_xxxxxxxxxxxxxxxxxxxxxxxx`}</code>
            </pre>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
            <pre className="overflow-x-auto text-sm">
              <code>{`curl -H "Authorization: Bearer <api_key>" \\
  https://your-domain.example/api/v1/customers`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
