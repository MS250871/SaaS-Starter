import { prepareWorkspaceCustomerCsvImport } from '@/modules/workspace/services/workspace-customer-csv-import.services';

export async function previewWorkspaceCustomerCsvImportWorkflow(params: {
  workspaceId: string;
  csvText: string;
  fileName?: string | null;
}) {
  return prepareWorkspaceCustomerCsvImport(params);
}
