'use client';

import { usePathname, useRouter } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { ListPlusIcon, LogInIcon, PlusIcon } from 'lucide-react';
import { Suspense, use, useActionState, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod/v4';
import { PlaylistName } from '@/domain/playlists';
import { readStorage, writeStorage } from '@/lib/browserStorage';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import {
  addToPlaylist,
  createPlaylist,
  type OwnPlaylist,
  ownPlaylists,
  removeSegment,
} from '@/playlists/commands';
import { PlaylistWriteError } from '@/playlists/transport';
import { Button } from '@/ui/base/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/base/shadcn/dialog';
import { Input } from '@/ui/base/shadcn/input';
import { TOASTER_ID } from './toasts';
import {
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuRoot,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from '@/ui/base/Menu';

// Add to Playlist (docs/playlist-editing.md): your playlists, the one you last
// added to first, then New Playlist…. What's added goes in as one segment, so a
// show's tape (or a run like Twist → Jam) stays together under shuffle. The list
// loads each time the menu opens; signed out, the server says so (401), and the
// menu offers Sign In instead.

/** What to add, looked up when it's chosen (a show's tracks are fetched then); null if that failed. */
export type PlaylistTracks = () => Promise<{ trackIds: string[] } | null>;

type Library =
  | { kind: 'ok'; playlists: OwnPlaylist[] }
  | { kind: 'signed-out' }
  | { kind: 'error' };

const LAST_KEY = 'relisten:last-playlist';

/**
 * Your playlists, fetched fresh each time a menu opens (so a sign-in, a switch of
 * account or an edit in another tab always shows): the opening menu holds the
 * request, and the list suspends on it. Never rejects.
 */
function fetchLibrary(): Promise<Library> {
  return ownPlaylists().then(
    (playlists): Library => {
      const last = readStorage(LAST_KEY);
      // The playlist added to last goes first; the rest stay most recently changed first.
      return {
        kind: 'ok',
        playlists: [...playlists].sort((a, b) => Number(b.id === last) - Number(a.id === last)),
      };
    },
    (err: unknown): Library =>
      err instanceof PlaylistWriteError && err.kind === 'signed-out'
        ? { kind: 'signed-out' }
        : { kind: 'error' }
  );
}

/** A request per opening of a menu: started by its onOpenChange, read by its list. */
function useLibraryOnOpen() {
  const [library, setLibrary] = useState<Promise<Library> | null>(null);
  const onOpenChange = (open: boolean) => {
    if (open) setLibrary(fetchLibrary());
  };
  return { library, onOpenChange };
}

const playlistHref = (playlistId: string) =>
  href('/playlists/[playlist]', { playlist: playlistId });

function failed(err: unknown, what: string) {
  const kind = err instanceof PlaylistWriteError ? err.kind : 'unavailable';
  toast.error(
    kind === 'signed-out'
      ? 'Sign in to save to playlists'
      : kind === 'invalid' && err instanceof PlaylistWriteError && err.detail
        ? err.detail
        : `Couldn't ${what}. Try again in a moment.`,
    { toasterId: TOASTER_ID }
  );
}

/** The menu's actions, bound to what it adds. */
function usePlaylistActions(tracks: PlaylistTracks) {
  const router = useRouter();
  const open = (playlistId: string) => () => router.push(playlistHref(playlistId));

  async function add(playlist: OwnPlaylist) {
    try {
      const found = await tracks();
      if (!found)
        return toast.error('Couldn’t load the tracks to add. Try again in a moment.', {
          toasterId: TOASTER_ID,
        });
      if (!found.trackIds.length) return toast.error('Nothing to add', { toasterId: TOASTER_ID });
      const added = await addToPlaylist(playlist, found.trackIds);
      writeStorage(LAST_KEY, playlist.id);
      toast.success(`Added to ${playlist.name}`, {
        toasterId: TOASTER_ID,
        action: { label: 'Open', onClick: open(playlist.id) },
        cancel: {
          label: 'Undo',
          onClick: () =>
            void removeSegment(playlist.id, added).then(
              () => toast(`Removed from ${playlist.name}`, { toasterId: TOASTER_ID }),
              (err: unknown) => failed(err, 'undo that')
            ),
        },
      });
    } catch (err) {
      failed(err, `add to ${playlist.name}`);
    }
  }

  return { add, open };
}

/** The list inside a menu: Sign In, or your playlists. Suspends while they load. */
function PlaylistItems({
  library,
  onAdd,
}: {
  library: Promise<Library>;
  onAdd: (p: OwnPlaylist) => void;
}) {
  const result = use(library);
  const pathname = usePathname();
  if (result.kind === 'signed-out') {
    return (
      <MenuLinkItem render={<a href={signInHref(pathname)} />} icon={LogInIcon}>
        Sign In to Save
      </MenuLinkItem>
    );
  }
  if (result.kind === 'error') {
    return <MenuItem disabled>Couldn’t load your playlists</MenuItem>;
  }
  return (
    <>
      {result.playlists.map((p) => (
        <MenuItem key={p.id} onClick={() => onAdd(p)}>
          <span className="min-w-0 flex-1 truncate">{p.name}</span>
          <span className="text-xs text-text-muted tabular-nums">{p.trackCount}</span>
        </MenuItem>
      ))}
      {result.playlists.length > 0 && <MenuSeparator />}
    </>
  );
}

function MenuContents({
  library,
  tracks,
  onNew,
}: {
  library: Promise<Library> | null;
  tracks: PlaylistTracks;
  onNew: () => void;
}) {
  const { add } = usePlaylistActions(tracks);
  const loading = <MenuItem disabled>Loading…</MenuItem>;
  return (
    <>
      <Suspense fallback={loading}>
        {library ? <PlaylistItems library={library} onAdd={(p) => void add(p)} /> : loading}
      </Suspense>
      <MenuItem onClick={onNew} icon={PlusIcon}>
        New Playlist…
      </MenuItem>
    </>
  );
}

/**
 * Add to Playlist, as a submenu of a row's ⋯ menu. The New Playlist dialog lives
 * outside the menu (which closes on a click): the parent renders <NewPlaylistDialog>.
 */
export function AddToPlaylistSubmenu({
  tracks,
  onNew,
}: {
  tracks: PlaylistTracks;
  onNew: () => void;
}) {
  const { library, onOpenChange } = useLibraryOnOpen();
  return (
    <MenuSubmenuRoot onOpenChange={onOpenChange}>
      <MenuSubmenuTrigger icon={ListPlusIcon}>Add to Playlist</MenuSubmenuTrigger>
      <MenuContent className="max-h-80 overflow-y-auto">
        <MenuContents library={library} tracks={tracks} onNew={onNew} />
      </MenuContent>
    </MenuSubmenuRoot>
  );
}

/** Add to Playlist as its own button (a show page's tape). */
export function AddToPlaylistButton({
  tracks,
  defaultName,
  className,
}: {
  tracks: PlaylistTracks;
  defaultName: string;
  className?: string;
}) {
  const [naming, setNaming] = useState(false);
  const { library, onOpenChange } = useLibraryOnOpen();
  return (
    <>
      <MenuRoot onOpenChange={onOpenChange}>
        <MenuTrigger className={className}>
          <ListPlusIcon className="size-4 text-text-muted" aria-hidden />
          Add to Playlist
        </MenuTrigger>
        <MenuContent align="start" className="max-h-80 overflow-y-auto">
          <MenuContents library={library} tracks={tracks} onNew={() => setNaming(true)} />
        </MenuContent>
      </MenuRoot>
      <NewPlaylistDialog
        open={naming}
        onOpenChange={setNaming}
        tracks={tracks}
        defaultName={defaultName}
      />
    </>
  );
}

/**
 * A failed create: why, and the name as typed (React resets the form after its
 * action, so the field takes it back as its default rather than losing it).
 */
type CreateState = { error: string; name: string } | null;

/** The dialog's form. */
const NewPlaylistForm = z.object({ name: PlaylistName });

/** Names a new playlist and creates it with the tracks, in one request. */
export function NewPlaylistDialog({
  open,
  onOpenChange,
  tracks,
  defaultName = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracks: PlaylistTracks;
  defaultName?: string;
}) {
  const { open: openPlaylist } = usePlaylistActions(tracks);
  const [state, create, pending] = useActionState(
    async (_prev: CreateState, form: FormData): Promise<CreateState> => {
      const typed = String(form.get('name') ?? '');
      const parsed = NewPlaylistForm.safeParse(Object.fromEntries(form));
      if (!parsed.success)
        return { error: parsed.error.issues[0]?.message ?? 'Check the name.', name: typed };
      const { name } = parsed.data;
      try {
        // A lookup that failed (a show's tracks didn't load) creates nothing: the
        // dialog stays open to try again.
        const found = await tracks();
        if (!found)
          return { error: 'Couldn’t load the tracks to add. Try again in a moment.', name: typed };
        const { playlistId } = await createPlaylist({ name, trackIds: found.trackIds });
        writeStorage(LAST_KEY, playlistId);
        onOpenChange(false);
        toast.success(`Created ${name}`, {
          toasterId: TOASTER_ID,
          action: { label: 'Open', onClick: openPlaylist(playlistId) },
        });
        return null;
      } catch (err) {
        if (err instanceof PlaylistWriteError && err.kind === 'signed-out')
          return { error: 'Sign in to create playlists.', name: typed };
        if (err instanceof PlaylistWriteError && err.kind === 'invalid' && err.detail)
          return { error: err.detail, name: typed };
        return { error: "Couldn't create it. Try again in a moment.", name: typed };
      }
    },
    null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={create} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New Playlist</DialogTitle>
            <DialogDescription>It starts private. Publish it when it’s ready.</DialogDescription>
          </DialogHeader>
          <Input
            name="name"
            aria-label="Name"
            placeholder="Name"
            defaultValue={state?.name ?? defaultName}
            maxLength={100}
            required
            autoFocus
            aria-invalid={!!state?.error}
          />
          {state?.error && (
            <p role="alert" className="m-0 text-sm text-red-500">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
