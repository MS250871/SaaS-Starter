'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useActionToast } from '@/hooks/use-action-toast';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import { SupportThreadEntryCard } from '@/modules/support/components/support-thread-entry-card';
import type { SupportThreadEntryView } from '@/modules/support/server/support-thread-view';
import { addPlatformSupportTicketInternalNoteAction } from '@/modules/support/actions/platform-support-admin.actions';

export function PlatformSupportTicketInternalNotesPanel({
  ticketId,
  items,
  disabled = false,
  onNoteAdded,
}: {
  ticketId: string;
  items: SupportThreadEntryView[];
  disabled?: boolean;
  onNoteAdded?: (entry: {
    id: string;
    message: string;
    createdAt: string;
  }) => void;
}) {
  const router = useRouter();
  const { showActionError, showActionSuccess } = useActionToast();
  const [internalNote, setInternalNote] = useState('');
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [noteInputKey, setNoteInputKey] = useState(0);
  const [isNotePending, startNoteTransition] = useTransition();

  const submitInternalNote = () => {
    if (!internalNote.trim()) {
      return;
    }

    startNoteTransition(async () => {
      const submittedMessage = internalNote.trim();
      const formData = new FormData();
      formData.set('ticketId', ticketId);
      formData.set('message', submittedMessage);
      noteFiles.forEach((file) => formData.append('attachments', file));

      const response = await addPlatformSupportTicketInternalNoteAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      onNoteAdded?.({
        id: response.data.messageId,
        message: submittedMessage,
        createdAt: new Date().toISOString(),
      });
      showActionSuccess(response.data.successMessage, 'Internal note added.');
      setInternalNote('');
      setNoteFiles([]);
      setNoteInputKey((current) => current + 1);
      router.refresh();
    });
  };

  return (
    <Card className="border-border/70 bg-background/85">
      <CardHeader>
        <CardTitle>Internal Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            No internal notes yet for this escalation.
          </div>
        ) : (
          items.map((item) => <SupportThreadEntryCard key={item.id} item={item} />)
        )}

        <div className="border-t border-border/70 pt-4">
          <div className="space-y-4">
            <p className="text-sm font-medium">Add platform-only note</p>
            <Textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="Capture handoff context, investigation notes, or follow-up tasks."
              disabled={disabled || isNotePending}
            />
            <Input
              key={noteInputKey}
              type="file"
              multiple
              disabled={disabled || isNotePending}
              onChange={(event) => {
                setNoteFiles(Array.from(event.target.files ?? []));
              }}
            />
            {noteFiles.length > 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                {noteFiles.map((file) => file.name).join(', ')}
              </div>
            ) : null}
            {isNotePending ? (
              <SpinnerButton
                className="w-full sm:w-auto"
                message="Saving note..."
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={submitInternalNote}
                disabled={disabled || !internalNote.trim()}
              >
                Add Internal Note
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
