'use client';

import { Menu } from '@base-ui/react/menu';
import { usePathname, useRouter } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { ChevronRightIcon, ListPlusIcon, LogInIcon, PlusIcon } from 'lucide-react';
import { Suspense, use, useActionState, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod/v4';
import { readStorage, writeStorage } from '@/lib/browserStorage';
import cn from '@/lib/cn';
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
import { MENU_ITEM, MENU_POPUP } from './menuStyles';
import { TOASTER_ID } from './toasts';

// Add to Playlist (docs/playlist-editing.md): your playlists, the one you last
// added to first, then New Playlist…. What's added goes in as one segment, so a
// show's tape (or a run like Twist → Jam) stays together under shuffle. The list
// loads each time the menu opens; signed out, the server says so (401), and the
// menu offers Sign In instead.

/** What to add, looked up when it's chosen (a show's tracks are fetched then). */
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
  href('/account/playlists/[playlistId]', { playlistId });

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
      if (!found?.trackIds.length) return toast.error('Nothing to add', { toasterId: TOASTER_ID });
      const { segmentId } = await addToPlaylist(playlist.id, found.trackIds);
      writeStorage(LAST_KEY, playlist.id);
      toast.success(`Added to ${playlist.name}`, {
        toasterId: TOASTER_ID,
        action: { label: 'Open', onClick: open(playlist.id) },
        cancel: {
          label: 'Undo',
          onClick: () =>
            void removeSegment(playlist.id, segmentId).then(
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
      <Menu.LinkItem className={MENU_ITEM} render={<a href={signInHref(pathname)} />}>
        <LogInIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
        Sign In to Save
      </Menu.LinkItem>
    );
  }
  if (result.kind === 'error') {
    return (
      <Menu.Item className={MENU_ITEM} disabled>
        Couldn’t load your playlists
      </Menu.Item>
    );
  }
  return (
    <>
      {result.playlists.map((p) => (
        <Menu.Item key={p.id} className={MENU_ITEM} onClick={() => onAdd(p)}>
          <span className="min-w-0 flex-1 truncate">{p.name}</span>
          <span className="text-xs text-text-muted tabular-nums">{p.trackCount}</span>
        </Menu.Item>
      ))}
      {result.playlists.length > 0 && <Menu.Separator className="mx-2 my-1 h-px bg-hairline" />}
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
  const loading = (
    <Menu.Item className={MENU_ITEM} disabled>
      Loading…
    </Menu.Item>
  );
  return (
    <>
      <Suspense fallback={loading}>
        {library ? <PlaylistItems library={library} onAdd={(p) => void add(p)} /> : loading}
      </Suspense>
      <Menu.Item className={MENU_ITEM} onClick={onNew}>
        <PlusIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
        New Playlist…
      </Menu.Item>
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
    <Menu.SubmenuRoot onOpenChange={onOpenChange}>
      <Menu.SubmenuTrigger className={MENU_ITEM}>
        <ListPlusIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
        <span className="flex-1">Add to Playlist</span>
        <ChevronRightIcon size={14} className="shrink-0 text-text-muted" aria-hidden />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} className="z-50 outline-none">
          <Menu.Popup className={cn(MENU_POPUP, 'max-h-80 max-w-72 overflow-y-auto')}>
            <MenuContents library={library} tracks={tracks} onNew={onNew} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
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
      <Menu.Root onOpenChange={onOpenChange}>
        <Menu.Trigger className={className}>
          <ListPlusIcon className="size-4 text-text-muted" aria-hidden />
          Add to Playlist
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" sideOffset={4} className="z-50 outline-none">
            <Menu.Popup className={cn(MENU_POPUP, 'max-h-80 max-w-72 overflow-y-auto')}>
              <MenuContents library={library} tracks={tracks} onNew={() => setNaming(true)} />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <NewPlaylistDialog
        open={naming}
        onOpenChange={setNaming}
        tracks={tracks}
        defaultName={defaultName}
      />
    </>
  );
}

type CreateState = { error: string } | null;

/** The dialog's form. The server's own limits: a name is 1–100 characters, trimmed. */
const NewPlaylistForm = z.object({
  name: z.string().trim().min(1, 'Give it a name.').max(100, 'Names can be up to 100 characters.'),
});

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
      const parsed = NewPlaylistForm.safeParse(Object.fromEntries(form));
      if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the name.' };
      const { name } = parsed.data;
      try {
        const found = await tracks();
        const { playlistId } = await createPlaylist({ name, trackIds: found?.trackIds ?? [] });
        writeStorage(LAST_KEY, playlistId);
        onOpenChange(false);
        toast.success(`Created ${name}`, {
          toasterId: TOASTER_ID,
          action: { label: 'Open', onClick: openPlaylist(playlistId) },
        });
        return null;
      } catch (err) {
        if (err instanceof PlaylistWriteError && err.kind === 'signed-out')
          return { error: 'Sign in to create playlists.' };
        if (err instanceof PlaylistWriteError && err.kind === 'invalid' && err.detail)
          return { error: err.detail };
        return { error: "Couldn't create it. Try again in a moment." };
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
            defaultValue={defaultName}
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
