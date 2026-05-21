import { notFound } from 'next/navigation';

import { PlatformSupportTicketDetailView } from '@/modules/platform/components/operations/platform-support-ticket-detail-view';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { hasAnyPermission } from '@/modules/permissions/permissions.services';
import { getPlatformSupportTicketDetailPageData } from '@/modules/support/server/platform-support-admin-page-data';

export default async function PlatformOperationsSupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const actor = await requirePlatformPermission('platformSupport.read');
  const { ticketId } = await params;
  const data = await getPlatformSupportTicketDetailPageData(ticketId);

  if (!data) {
    notFound();
  }

  return (
    <PlatformSupportTicketDetailView
      data={data}
      canUpdateTicket={hasAnyPermission(actor.permissions, [
        'platformSupport.update',
      ])}
      canAssignTicket={hasAnyPermission(actor.permissions, [
        'platformSupport.assign',
        'platformSupport.update',
      ])}
      canReplyTicket={hasAnyPermission(actor.permissions, [
        'platformSupport.reply',
        'platformSupport.update',
        'supportTicket.reply',
        'supportTicket.update',
      ])}
      canAddInternalNote={hasAnyPermission(actor.permissions, [
        'platformSupport.update',
        'supportTicket.internalNote',
        'supportTicket.update',
      ])}
    />
  );
}
