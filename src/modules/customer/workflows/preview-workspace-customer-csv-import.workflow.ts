import { prepareWorkspaceCustomerCsvImport } from '@/modules/customer/services/workspace-customer-csv-import.services';

export async function previewWorkspaceCustomerCsvImportWorkflow(params: {
  workspaceId: string;
  csvText: string;
  fileName?: string | null;
}) {
  return prepareWorkspaceCustomerCsvImport(params);
}
