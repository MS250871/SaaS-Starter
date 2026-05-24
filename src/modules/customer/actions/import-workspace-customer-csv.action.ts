'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/services/permissions.services';
import {
  importWorkspaceCustomerCsvActionSchema,
  type ImportWorkspaceCustomerCsvActionInput,
} from '@/modules/workspace/schema';
import { importWorkspaceCustomerCsvWorkflow } from '@/modules/customer/workflows/import-workspace-customer-csv.workflow';

const importWorkspaceCustomerCsvActionImpl = createTxAction(
  async (formData: FormData) => {
    const parsed: ImportWorkspaceCustomerCsvActionInput =
      importWorkspaceCustomerCsvActionSchema.parse({
        csvText: formData.get('csvText'),
        fileName: formData.get('fileName') ?? '',
      });

    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'customer.create');

    const result = await importWorkspaceCustomerCsvWorkflow({
      workspaceId: session.workspaceId,
      csvText: parsed.csvText,
      fileName: parsed.fileName || null,
    });

    return {
      successMessage: `${result.summary.importedRows} customer(s) imported successfully.`,
      ...result,
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const fileName = String(formData.get('fileName') ?? '').trim() || null;

        return {
          scope: 'WORKSPACE' as const,
          category: 'CUSTOMER' as const,
          source: 'WORKSPACE_APP' as const,
          action: 'workspace.customer.importCsv',
          entityType: 'Workspace',
          description: `${result.summary.importedRows} customer(s) imported from CSV.`,
          metadata: {
            errorRows: result.summary.errorRows,
            existingRows: result.summary.existingRows,
            fileName,
            importedRows: result.summary.importedRows,
            skippedRows: result.summary.skippedRows,
            totalRows: result.summary.totalRows,
          },
        };
      },
    },
  },
);

export async function importWorkspaceCustomerCsvAction(formData: FormData) {
  return importWorkspaceCustomerCsvActionImpl(formData);
}
