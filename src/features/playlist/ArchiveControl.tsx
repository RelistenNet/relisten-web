'use client';

import { ArchiveIcon, ArchiveRestoreIcon } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { reportStaleAction, TOASTER_ID } from '@/player/toasts';
import { PlaylistWriteError, playlistTransport } from '@/playlists/transport';
import { refreshPublicPlaylist } from './publishActions';
import { useOwnPlaylistRefresh } from './useOwnPlaylistRefresh';

/**
 * Archive a playlist, or bring an archived one back. Archived, it's hidden from
 * readers (a published one too) and can't be edited or published until it's
 * back; both ways are one click, since both undo.
 */
export default function ArchiveControl({
  playlistId,
  archived,
}: {
  playlistId: string;
  archived: boolean;
}) {
  const showChange = useOwnPlaylistRefresh(playlistId);
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      try {
        await playlistTransport.setArchived(playlistId, !archived);
        // A published one's public page caches for a minute: have it read the change now.
        await refreshPublicPlaylist(playlistId);
        showChange();
        toast.success(archived ? 'Unarchived.' : 'Archived. Unarchive it to edit it again.', {
          toasterId: TOASTER_ID,
        });
      } catch (err) {
        if (reportStaleAction(err)) return;
        toast.error(
          err instanceof PlaylistWriteError && err.kind === 'signed-out'
            ? 'Sign in to change it.'
            : err instanceof PlaylistWriteError && err.detail
              ? err.detail
              : `Couldn’t ${archived ? 'unarchive' : 'archive'} it. Try again in a moment.`,
          { toasterId: TOASTER_ID }
        );
      }
    });

  const Icon = archived ? ArchiveRestoreIcon : ArchiveIcon;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`${archived ? 'header-action-primary' : 'header-action-quiet'} disabled:opacity-50`}
    >
      <Icon className="size-4" aria-hidden />
      {archived ? (pending ? 'Unarchiving…' : 'Unarchive') : pending ? 'Archiving…' : 'Archive'}
    </button>
  );
}
