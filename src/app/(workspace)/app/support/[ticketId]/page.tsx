import { WorkspaceSupportThreadPanel } from '@/modules/workspace/components/workspace-support-thread-panel';
import { getWorkspaceSupportThreadPageData } from '@/modules/workspace/server/workspace-admin-page-data';

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
      canUpdateTicket={
        actor.permissions.includes('supportTicket.update') ||
        actor.permissions.includes('supportTicket.close') ||
        actor.permissions.includes('supportTicket.reopen')
      }
      canAssignTicket={
        actor.permissions.includes('supportTicket.assign') ||
        actor.permissions.includes('supportTicket.update')
      }
      canReplyTicket={
        actor.permissions.includes('supportTicket.reply') ||
        actor.permissions.includes('supportTicket.update')
      }
      canAddInternalNote={
        actor.permissions.includes('supportTicket.internalNote') ||
        actor.permissions.includes('supportTicket.update')
      }
    />
  );
}
