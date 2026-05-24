'use client';

import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useActionToast } from '@/hooks/use-action-toast';
import {
  updatePlatformSupportTicketAssignmentAction,
  updatePlatformSupportTicketStatusAction,
} from '@/modules/support/actions/platform-support-admin.actions';

const supportStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;

export function PlatformSupportTicketControls({
  ticketId,
  currentStatus,
  currentAssigneeId,
  assigneeOptions,
  canUpdateTicket,
  canAssignTicket,
  onStatusUpdated,
  onAssignmentUpdated,
}: {
  ticketId: string;
  currentStatus: string;
  currentAssigneeId: string | null;
  assigneeOptions: Array<{
    identityId: string;
    name: string;
    email: string | null;
    roleLabel: string;
  }>;
  canUpdateTicket: boolean;
  canAssignTicket: boolean;
  onStatusUpdated?: (nextStatus: string) => void;
  onAssignmentUpdated?: (next: {
    assignedToId: string | null;
    assigneeName: string | null;
  }) => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId ?? 'unassigned');
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isAssignmentPending, startAssignmentTransition] = useTransition();
  const { showActionError, showActionSuccess } = useActionToast();

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    setAssigneeId(currentAssigneeId ?? 'unassigned');
  }, [currentAssigneeId]);

  const runStatusUpdate = () => {
    startStatusTransition(async () => {
      const formData = new FormData();
      formData.set('ticketId', ticketId);
      formData.set('status', status);

      const response = await updatePlatformSupportTicketStatusAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      onStatusUpdated?.(response.data.status);
      showActionSuccess(response.data.successMessage, 'Ticket status updated.');
    });
  };

  const runAssignmentUpdate = () => {
    startAssignmentTransition(async () => {
      const formData = new FormData();
      formData.set('ticketId', ticketId);
      formData.set('assignedToId', assigneeId);

      const response = await updatePlatformSupportTicketAssignmentAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      onAssignmentUpdated?.({
        assignedToId: response.data.assignedToId,
        assigneeName: response.data.assigneeName,
      });
      showActionSuccess(
        response.data.successMessage,
        'Ticket assignment updated.',
      );
    });
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="platform-support-status">Ticket status</Label>
        <select
          id="platform-support-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          disabled={!canUpdateTicket || isStatusPending}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
        >
          {supportStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          onClick={runStatusUpdate}
          disabled={!canUpdateTicket || isStatusPending}
        >
          {isStatusPending ? 'Updating status...' : 'Update status'}
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="platform-support-assignee">Assigned operator</Label>
        <select
          id="platform-support-assignee"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          disabled={!canAssignTicket || isAssignmentPending}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
        >
          <option value="unassigned">Unassigned</option>
          {assigneeOptions.map((option) => (
            <option key={option.identityId} value={option.identityId}>
              {option.name} - {option.roleLabel}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          onClick={runAssignmentUpdate}
          disabled={!canAssignTicket || isAssignmentPending}
        >
          {isAssignmentPending ? 'Updating assignment...' : 'Update assignment'}
        </Button>
      </div>
    </div>
  );
}
