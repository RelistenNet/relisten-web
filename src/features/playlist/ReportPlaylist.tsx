'use client';

import { usePathname } from '@timber-js/app/client';
import { FlagIcon } from 'lucide-react';
import { useActionState, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod/v4';
import cn from '@/lib/cn';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import { TOASTER_ID } from '@/player/toasts';
import { PlaylistWriteError, playlistTransport } from '@/playlists/transport';
import { Button } from '@/ui/base/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/base/shadcn/dialog';
import { ACTION } from './PlaylistArticle';

// Report a public playlist (RelistenApi docs/design/2026-11-18-playlist-sharing.md,
// "Reporting and takedown"). Anyone signed in can report; the User Service
// queues it for review, and a takedown makes the page a 404 within a minute.

/** The server's rule: a reason of 1–300 characters, trimmed. */
const ReportForm = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Say what’s wrong with it.')
    .max(300, 'Keep it to 300 characters.'),
});

/**
 * A failed report: why, and the reason as written (React resets the form after its
 * action, so the field takes it back as its default rather than losing it).
 */
type ReportState = { error: string; signIn?: boolean; reason: string } | null;

export default function ReportPlaylist({ publicCode }: { publicCode: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [state, report, pending] = useActionState(
    async (_prev: ReportState, form: FormData): Promise<ReportState> => {
      const reason = String(form.get('reason') ?? '');
      const parsed = ReportForm.safeParse(Object.fromEntries(form));
      if (!parsed.success)
        return { error: parsed.error.issues[0]?.message ?? 'Check the reason.', reason };
      try {
        await playlistTransport.report(publicCode, parsed.data.reason);
        setOpen(false);
        toast.success('Thanks. We’ll take a look.', { toasterId: TOASTER_ID });
        return null;
      } catch (err) {
        if (err instanceof PlaylistWriteError && err.kind === 'signed-out')
          return { error: 'Sign in to report a playlist.', signIn: true, reason };
        if (err instanceof PlaylistWriteError && err.kind === 'invalid' && err.detail)
          return { error: err.detail, reason };
        return { error: 'Couldn’t send that. Try again in a moment.', reason };
      }
    },
    null
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(ACTION, 'border-transparent text-text-muted hover:text-text-primary')}
      >
        <FlagIcon className="size-4" aria-hidden />
        Report
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={report} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Report this playlist</DialogTitle>
              <DialogDescription>
                What’s wrong with it? Reports go to the Relisten team.
              </DialogDescription>
            </DialogHeader>
            <textarea
              name="reason"
              defaultValue={state?.reason}
              aria-label="Reason"
              rows={4}
              maxLength={300}
              required
              autoFocus
              aria-invalid={!!state?.error}
              className="
                w-full resize-none rounded-lg bg-surface-raised px-2.5 py-2 text-sm ring-1
                ring-hairline outline-none focus:ring-accent
              "
            />
            {state?.error && (
              <p role="alert" className="m-0 text-sm text-red-500">
                {state.error}{' '}
                {state.signIn && (
                  <a href={signInHref(pathname)} className="underline underline-offset-2">
                    Sign in
                  </a>
                )}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? 'Sending…' : 'Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
