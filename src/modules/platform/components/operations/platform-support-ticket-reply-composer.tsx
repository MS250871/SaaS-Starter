'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useActionToast } from '@/hooks/use-action-toast';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import { addPlatformSupportTicketReplyAction } from '@/modules/support/actions/platform-support-admin.actions';

export function PlatformSupportTicketReplyComposer({
  ticketId,
  disabled = false,
  onReplyAdded,
}: {
  ticketId: string;
  disabled?: boolean;
  onReplyAdded?: (entry: {
    id: string;
    message: string;
    createdAt: string;
  }) => void;
}) {
  const router = useRouter();
  const { showActionError, showActionSuccess } = useActionToast();
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyInputKey, setReplyInputKey] = useState(0);
  const [isReplyPending, startReplyTransition] = useTransition();

  const submitReply = () => {
    if (!replyMessage.trim()) {
      return;
    }

    startReplyTransition(async () => {
      const submittedMessage = replyMessage.trim();
      const hasAttachments = replyFiles.length > 0;
      const formData = new FormData();
      formData.set('ticketId', ticketId);
      formData.set('message', submittedMessage);
      replyFiles.forEach((file) => formData.append('attachments', file));

      const response = await addPlatformSupportTicketReplyAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      if (!hasAttachments) {
        onReplyAdded?.({
          id: response.data.messageId,
          message: submittedMessage,
          createdAt: new Date().toISOString(),
        });
      }
      showActionSuccess(response.data.successMessage, 'Reply added.');
      setReplyMessage('');
      setReplyFiles([]);
      setReplyInputKey((current) => current + 1);
      if (hasAttachments) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4 border-t border-border/70 pt-4">
      <div>
        <p className="text-sm font-medium">Reply</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Continue the escalation thread with the workspace requester.
        </p>
      </div>
      <Textarea
        value={replyMessage}
        onChange={(event) => setReplyMessage(event.target.value)}
        placeholder="Write the next response for the workspace requester."
        disabled={disabled || isReplyPending}
      />
      <Input
        key={replyInputKey}
        type="file"
        multiple
        disabled={disabled || isReplyPending}
        onChange={(event) => {
          setReplyFiles(Array.from(event.target.files ?? []));
        }}
      />
      {replyFiles.length > 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
          {replyFiles.map((file) => file.name).join(', ')}
        </div>
      ) : null}
      {isReplyPending ? (
        <SpinnerButton
          className="w-full sm:w-auto"
          message="Sending reply..."
        />
      ) : (
        <Button
          type="button"
          onClick={submitReply}
          disabled={disabled || !replyMessage.trim()}
        >
          Send Reply
        </Button>
      )}
    </div>
  );
}
