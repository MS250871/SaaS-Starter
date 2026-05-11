import { WorkspaceCustomerDetailsPanel } from '@/modules/workspace/components/workspace-customer-details-panel';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/workspace-admin-page-data';

export default async function WorkspaceCustomerPreviewPage() {
  const { basePath, workspaceId } = await getWorkspaceAdminSurfaceContext();

  if (!workspaceId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    );
  }

  return (
    <WorkspaceCustomerDetailsPanel
      basePath={basePath}
      preview
      customer={{
        id: 'preview-customer',
        name: 'Aarav Patel',
        email: 'aarav.patel@example.com',
        phone: '+91 98765 43210',
        externalId: 'crm_learner_1024',
        createdAt: new Date('2026-03-12T09:30:00.000Z').toISOString(),
        supportTicketCount: 4,
        notificationCount: 12,
        mediaCount: 7,
      }}
    />
  );
}
