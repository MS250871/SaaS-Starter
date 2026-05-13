import { importWorkspaceCustomersFromCsv } from '@/modules/customer/services/workspace-customer-csv-import.services';

export async function importWorkspaceCustomerCsvWorkflow(params: {
  workspaceId: string;
  csvText: string;
  fileName?: string | null;
}) {
  return importWorkspaceCustomersFromCsv(params);
}
