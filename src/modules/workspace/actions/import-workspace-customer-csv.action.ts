'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/permissions.services';
import {
  importWorkspaceCustomerCsvActionSchema,
  type ImportWorkspaceCustomerCsvActionInput,
} from '@/modules/workspace/schema';
import { importWorkspaceCustomerCsvWorkflow } from '@/modules/workspace/workflows/import-workspace-customer-csv.workflow';

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
);

export async function importWorkspaceCustomerCsvAction(formData: FormData) {
  return importWorkspaceCustomerCsvActionImpl(formData);
}
