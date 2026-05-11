import { WorkspaceNotificationsPanel } from '@/modules/workspace/components/workspace-notifications-panel';
import { getWorkspaceNotificationsPageData } from '@/modules/workspace/server/workspace-admin-page-data';

export default async function WorkspaceNotificationsPage() {
  const data = await getWorkspaceNotificationsPageData();

  return (
    <WorkspaceNotificationsPanel
      inboxNotifications={data.inboxNotifications}
      inboxSummary={data.inboxSummary}
      workspaceRecipients={data.workspaceRecipients}
      customerRecipients={data.customerRecipients}
      canCreate={data.actor.permissions.includes('notification.create')}
    />
  );
}
