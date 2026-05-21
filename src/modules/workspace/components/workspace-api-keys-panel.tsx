'use client';

import { useState, useTransition } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  CopyIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminDataTable } from '@/components/data-table/admin-data-table';
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
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="workspace-info-card border bg-background/85">
      <CardHeader className="gap-2">
        <p className="workspace-info-label text-sm font-medium">{label}</p>
        <CardTitle className="workspace-info-value text-2xl font-semibold">
          {value}
        </CardTitle>
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

  const columns: ColumnDef<ApiKeyListItem>[] = [
    {
      accessorKey: 'name',
      header: 'Key',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{row.original.name}</p>
            {row.original.keyPrefix ? (
              <Badge variant="outline">{row.original.keyPrefix}...</Badge>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              row.original.isActive && !row.original.isExpired
                ? 'default'
                : row.original.isActive
                  ? 'secondary'
                  : 'outline'
            }
          >
            {row.original.isActive
              ? row.original.isExpired
                ? 'Expired'
                : 'Active'
              : 'Revoked'}
          </Badge>
          {row.original.revokedAt ? (
            <Badge variant="outline">Revoked</Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'scopes',
      header: 'Scopes',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.scopes.length > 0 ? (
            row.original.scopes.slice(0, 2).map((scope) => (
              <Badge key={scope} variant="secondary">
                {scope}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Default</span>
          )}
          {row.original.scopes.length > 2 ? (
            <Badge variant="outline">+{row.original.scopes.length - 2}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'createdByName',
      header: 'Created By',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: 'lastUsedAt',
      header: 'Last Used',
      cell: ({ row }) =>
        row.original.lastUsedAt
          ? formatDateTime(row.original.lastUsedAt)
          : 'Not used yet',
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) =>
        row.original.expiresAt
          ? formatDateTime(row.original.expiresAt)
          : 'Does not expire',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
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
                  {row.original.name}. Make sure the integration is ready to
                  receive the replacement key immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => runRotate(row.original.id)}>
                  Rotate Key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!canRevoke || isPending || !row.original.isActive}
              >
                <Trash2Icon className="mr-2 size-4" />
                Revoke
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will disable {row.original.name} immediately and stop any
                  integration using it from authenticating.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => runRevoke(row.original.id)}>
                  Revoke Key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Keys" value={apiKeySummary.totalKeys} />
        <StatCard label="Active Keys" value={apiKeySummary.activeKeys} />
        <StatCard label="Revoked Keys" value={apiKeySummary.revokedKeys} />
        <StatCard label="Expired Keys" value={apiKeySummary.expiredKeys} />
      </div>

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
                  <div className="flex items-center">
                    {isPending ? (
                      <SpinnerButton message="Issuing API key..." />
                    ) : (
                      <Button type="submit" disabled={!canCreate}>
                        Issue API Key
                      </Button>
                    )}
                  </div>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <AdminDataTable
          title="Issued Keys"
          columns={columns}
          data={apiKeys}
          searchPlaceholder="Search keys by name, prefix, creator, scope, or status"
          emptyStateTitle="No API keys issued yet"
          emptyStateDescription="Issue the first workspace API key to manage integrations from this table."
          defaultPageSize={10}
          headerTextClassName="lg:max-w-[32rem] xl:max-w-[36rem]"
          actionsClassName="lg:flex-nowrap"
        />
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
