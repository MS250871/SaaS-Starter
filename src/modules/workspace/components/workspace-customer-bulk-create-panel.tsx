'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  DownloadIcon,
  FileUpIcon,
  UploadIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { importWorkspaceCustomerCsvAction } from '@/modules/customer/actions/import-workspace-customer-csv.action';
import { previewWorkspaceCustomerCsvImportAction } from '@/modules/customer/actions/preview-workspace-customer-csv-import.action';
import type {
  WorkspaceCustomerCsvPreparedImport,
  WorkspaceCustomerCsvPreparedRow,
} from '@/modules/customer/services/workspace-customer-csv-import.services';

function buildSampleCsv(workspaceSlug: string) {
  return [
    'workspaceSlug,firstName,lastName,email,phone,externalId',
    `${workspaceSlug},Aarav,Patel,aarav.patel@example.com,+919876543210,crm_aarav_001`,
    `${workspaceSlug},Mira,Shah,mira.shah@example.com,+919812345678,crm_mira_002`,
  ].join('\n');
}

function downloadCsvFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', fileName);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function statusBadgeVariant(status: WorkspaceCustomerCsvPreparedRow['status']) {
  if (status === 'ready') {
    return 'default' as const;
  }

  if (status === 'existing') {
    return 'secondary' as const;
  }

  return 'destructive' as const;
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

export function WorkspaceCustomerBulkCreatePanel({
  basePath,
  workspaceSlug,
}: {
  basePath: string;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [preview, setPreview] = useState<WorkspaceCustomerCsvPreparedImport | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const canImport = useMemo(
    () => Boolean(preview && preview.summary.readyRows > 0),
    [preview],
  );

  const handleTemplateDownload = () => {
    downloadCsvFile(
      `customers-import-template-${workspaceSlug}.csv`,
      buildSampleCsv(workspaceSlug),
    );
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;

    setPreview(null);
    setFlashMessage(null);
    setError(null);

    if (!file) {
      setCsvText('');
      setSelectedFileName(null);
      return;
    }

    const text = await file.text();
    setCsvText(text);
    setSelectedFileName(file.name);
  };

  const runPreview = () => {
    setError(null);
    setFlashMessage(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('csvText', csvText);
      formData.append('fileName', selectedFileName ?? 'customers.csv');

      const response = await previewWorkspaceCustomerCsvImportAction(formData);

      if (!response.success) {
        setPreview(null);
        setError(response.error.message);
        return;
      }

      setPreview(response.data);
      setFlashMessage('Preview generated. Review the rows before importing.');
    });
  };

  const runImport = () => {
    setError(null);
    setFlashMessage(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('csvText', csvText);
      formData.append('fileName', selectedFileName ?? 'customers.csv');

      const response = await importWorkspaceCustomerCsvAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      setFlashMessage(response.data.successMessage);
      setPreview(null);
      setCsvText('');
      setSelectedFileName(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Bulk Create Customers</CardTitle>
              <CardDescription className="mt-2">
                Upload a CSV to create identities, auth accounts, and workspace
                customers in one import pipeline.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={`${basePath}/customers`}>
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Back to Customers
                </Link>
              </Button>
              <Button type="button" variant="outline" onClick={handleTemplateDownload}>
                <DownloadIcon className="mr-2 size-4" />
                Download Sample CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>CSV Contract</CardTitle>
          <CardDescription>
            Required columns: <code>firstName</code>, <code>lastName</code>,{' '}
            <code>email</code>, <code>phone</code>. Optional columns:{' '}
            <code>externalId</code>, <code>workspaceSlug</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            This import runs inside the current workspace, so{' '}
            <code>workspaceSlug</code> is optional here. If present, it must
            match <code>{workspaceSlug}</code>.
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              onClick={runPreview}
              disabled={!csvText || isPending}
            >
              <FileUpIcon className="mr-2 size-4" />
              Preview Import
            </Button>
          </div>
          {selectedFileName && (
            <p className="text-sm text-muted-foreground">
              Selected file: <span className="font-medium">{selectedFileName}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {flashMessage && (
        <Alert>
          <AlertTitle>Updated</AlertTitle>
          <AlertDescription>{flashMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Bulk import failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {preview && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Rows"
              value={preview.summary.totalRows}
              detail="Total rows detected in the uploaded CSV."
            />
            <StatCard
              label="Ready"
              value={preview.summary.readyRows}
              detail="Rows that can be imported right away."
            />
            <StatCard
              label="Existing"
              value={preview.summary.existingRows}
              detail="Rows already present in this workspace."
            />
            <StatCard
              label="Errors"
              value={preview.summary.errorRows}
              detail="Rows that need correction before they can import."
            />
          </div>

          <Card className="border-border/70 bg-background/85">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Preview Results</CardTitle>
                  <CardDescription>
                    Import will create {preview.summary.willCreateCustomers}{' '}
                    customer record(s), {preview.summary.willCreateIdentities}{' '}
                    new identit{preview.summary.willCreateIdentities === 1 ? 'y' : 'ies'},
                    and {preview.summary.willCreateAuthAccounts} auth account(s).
                  </CardDescription>
                </div>
                {isPending ? (
                  <SpinnerButton
                    className="w-full lg:w-auto"
                    message="Importing customers..."
                  />
                ) : (
                  <Button
                    type="button"
                    onClick={runImport}
                    disabled={!canImport}
                  >
                    <UploadIcon className="mr-2 size-4" />
                    Import Ready Rows
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead>Row</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>External ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row) => (
                      <TableRow key={`preview-row-${row.rowNumber}`}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium">
                              {row.source.firstName ?? ''} {row.source.lastName ?? ''}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {row.source.email ?? 'No email'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.source.phone ?? 'No phone'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.source.externalId ?? 'Native'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(row.status)}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.issues.length > 0 ? (
                            <ul className="space-y-1 text-sm text-destructive">
                              {row.issues.map((issue) => (
                                <li key={issue}>{issue}</li>
                              ))}
                            </ul>
                          ) : row.status === 'existing' ? (
                            <span className="text-sm text-muted-foreground">
                              Customer already exists in this workspace.
                            </span>
                          ) : (
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>
                                {row.actions.willCreateIdentity
                                  ? 'Create identity'
                                  : 'Reuse existing identity'}
                              </p>
                              <p>
                                {row.actions.willCreateEmailAuthAccount
                                  ? 'Create email auth account'
                                  : 'Reuse email auth account'}
                              </p>
                              <p>
                                {row.actions.willCreatePhoneAuthAccount
                                  ? 'Create phone auth account'
                                  : 'Reuse phone auth account'}
                              </p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.summary.errorRows > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Some rows have errors</AlertTitle>
                  <AlertDescription>
                    Only rows marked <code>ready</code> can be imported. Fix the
                    errored rows in the CSV and preview again if you want a clean run.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
