import { WorkspaceSupportThreadPanel } from '@/modules/workspace/components/workspace-support-thread-panel';
import { getWorkspaceSupportThreadPageData } from '@/modules/support/server/workspace-support-page-data';
import { hasAnyPermission } from '@/modules/permissions/permissions.services';

export default async function WorkspaceSupportThreadPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const {
    actor,
    workspaceId,
    selectedTicket,
    assigneeOptions,
    backHref,
  } = await getWorkspaceSupportThreadPageData(ticketId);

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
    <WorkspaceSupportThreadPanel
      backHref={backHref}
      selectedTicket={selectedTicket}
      assigneeOptions={assigneeOptions}
      canUpdateTicket={hasAnyPermission(actor.permissions, [
        'supportTicket.update',
        'supportTicket.close',
        'supportTicket.reopen',
      ])}
      canAssignTicket={hasAnyPermission(actor.permissions, [
        'supportTicket.assign',
        'supportTicket.update',
      ])}
      canReplyTicket={hasAnyPermission(actor.permissions, [
        'supportTicket.reply',
        'supportTicket.update',
      ])}
      canAddInternalNote={hasAnyPermission(actor.permissions, [
        'supportTicket.internalNote',
        'supportTicket.update',
      ])}
    />
  );
}
