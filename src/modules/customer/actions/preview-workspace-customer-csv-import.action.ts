'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/services/permissions.services';
import {
  previewWorkspaceCustomerCsvImportActionSchema,
  type PreviewWorkspaceCustomerCsvImportActionInput,
} from '@/modules/workspace/schema';
import { previewWorkspaceCustomerCsvImportWorkflow } from '@/modules/customer/workflows/preview-workspace-customer-csv-import.workflow';

const previewWorkspaceCustomerCsvImportActionImpl = createTxAction(
  async (formData: FormData) => {
    const parsed: PreviewWorkspaceCustomerCsvImportActionInput =
      previewWorkspaceCustomerCsvImportActionSchema.parse({
        csvText: formData.get('csvText'),
        fileName: formData.get('fileName') ?? '',
      });

    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'customer.create');

    return previewWorkspaceCustomerCsvImportWorkflow({
      workspaceId: session.workspaceId,
      csvText: parsed.csvText,
      fileName: parsed.fileName || null,
    });
  },
);

export async function previewWorkspaceCustomerCsvImportAction(formData: FormData) {
  return previewWorkspaceCustomerCsvImportActionImpl(formData);
}
