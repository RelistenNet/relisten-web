'use client';

import { usePathname, useRouter } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { ListPlusIcon, LoaderCircleIcon, LogInIcon, PlusIcon } from 'lucide-react';
import { type ReactNode, Suspense, use, useState } from 'react';
import { toast } from 'sonner';
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
import { TOASTER_ID } from './toasts';
import {
  MenuContent,
  MenuFilterProvider,
  MenuInput,
  MenuItem,
  MenuLinkItem,
  MenuList,
  MenuRoot,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
  useMenuFilter,
} from '@/ui/base/Menu';

// Add to Playlist (docs/playlist-editing.md): a picker over your playlists, the
// one you last added to first. Typing filters them; the row at the top, New
// Playlist, takes what's typed (or the track's or show's name) as its name, and
// it stays put while the list loads or filters under it. Nothing is created
// until that row is chosen. What's added goes in as one segment, so a show's
// tape (or a run like Twist → Jam) stays together under shuffle. The list loads
// each time the menu opens; signed out, the server says so (401), and the menu
// offers Sign In instead.

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

  async function create(name: string) {
    const parsed = PlaylistName.safeParse(name);
    if (!parsed.success)
      return toast.error(parsed.error.issues[0]?.message ?? 'Check the name.', {
        toasterId: TOASTER_ID,
      });
    try {
      const found = await tracks();
      if (!found)
        return toast.error('Couldn’t load the tracks to add. Try again in a moment.', {
          toasterId: TOASTER_ID,
        });
      const { playlistId } = await createPlaylist({ name: parsed.data, trackIds: found.trackIds });
      writeStorage(LAST_KEY, playlistId);
      toast.success(`Created ${parsed.data}`, {
        toasterId: TOASTER_ID,
        action: { label: 'Open', onClick: open(playlistId) },
      });
    } catch (err) {
      failed(err, 'create the playlist');
    }
  }

  return { add, create };
}

/** The list under New Playlist: Sign In, or your playlists matching the query. Suspends while they load. */
function PlaylistItems({
  library,
  query,
  onAdd,
}: {
  library: Promise<Library>;
  query: string;
  onAdd: (p: OwnPlaylist) => void;
}) {
  const result = use(library);
  const pathname = usePathname();
  const { contains } = useMenuFilter();
  if (result.kind === 'signed-out') {
    return (
      <MenuLinkItem render={<a href={signInHref(pathname)} />} icon={LogInIcon}>
        Sign In to Save
      </MenuLinkItem>
    );
  }
  if (result.kind === 'error') return <Note>Couldn’t load your playlists</Note>;
  if (!result.playlists.length) return <Note>No playlists yet</Note>;
  const matches = result.playlists.filter((p) => contains(p.name, query.trim()));
  if (!matches.length) return <Note>No playlists match</Note>;
  return matches.map((p) => (
    <MenuItem key={p.id} label={p.name} onClick={() => onAdd(p)}>
      <span className="min-w-0 flex-1 truncate">{p.name}</span>
      <span className="text-xs text-text-muted tabular-nums">{p.trackCount}</span>
    </MenuItem>
  ));
}

/** A line in the list that isn't an item: nothing to highlight or choose. */
function Note({ children }: { children: ReactNode }) {
  return (
    <div className="py-2.5 pr-3 pl-2.5 text-base text-text-muted sm:py-1.5 sm:pr-2.5 sm:pl-2 sm:text-sm">
      {children}
    </div>
  );
}

/**
 * While your playlists load: a slow, muted spinner in the middle of the list's space.
 */
function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading your playlists"
      className="flex flex-1 animate-fade-in items-center justify-center py-4"
    >
      <LoaderCircleIcon
        className="size-4 animate-[spin_1.2s_linear_infinite] text-text-muted motion-reduce:animate-none"
        aria-hidden
      />
    </div>
  );
}

/**
 * The picker inside either menu. The list is one fixed height (New Playlist and
 * about five rows; more scroll), so the popup never changes size or moves as the
 * list loads or filters.
 */
function PickerContents({
  library,
  tracks,
  defaultName,
  query,
}: {
  library: Promise<Library> | null;
  tracks: PlaylistTracks;
  defaultName: string;
  query: string;
}) {
  const { add, create } = usePlaylistActions(tracks);
  const name = query.trim() || defaultName || 'New Playlist';
  const loading = <Loading />;
  return (
    <>
      <MenuInput aria-label="Find or name a playlist" placeholder="Find or name a playlist…" />
      <MenuList className="flex h-48 flex-col overflow-y-auto">
        <MenuItem label={name} onClick={() => void create(name)} icon={PlusIcon}>
          <span className="min-w-0 flex-1 truncate">New Playlist “{name}”</span>
        </MenuItem>
        {/* The list is a flex column: without shrink-0 an overflowing list squeezes it to nothing. */}
        <MenuSeparator className="shrink-0" />
        <Suspense fallback={loading}>
          {library ? (
            <PlaylistItems library={library} query={query} onAdd={(p) => void add(p)} />
          ) : (
            loading
          )}
        </Suspense>
      </MenuList>
    </>
  );
}

/**
 * A request for your playlists per opening of a menu, and its filter's query
 * (Base UI empties it when the menu closes).
 */
function usePicker() {
  const { library, onOpenChange } = useLibraryOnOpen();
  const [query, setQuery] = useState('');
  return {
    library,
    onOpenChange,
    filter: { filter: null, value: query, onValueChange: setQuery },
    query,
  };
}

/** Add to Playlist, as a submenu of a row's ⋯ menu. */
export function AddToPlaylistSubmenu({
  tracks,
  defaultName,
}: {
  tracks: PlaylistTracks;
  /** New Playlist's name until one is typed: the track's or show's. */
  defaultName: string;
}) {
  const { library, onOpenChange, filter, query } = usePicker();
  return (
    <MenuFilterProvider {...filter}>
      <MenuSubmenuRoot onOpenChange={onOpenChange}>
        <MenuSubmenuTrigger icon={ListPlusIcon}>Add to Playlist</MenuSubmenuTrigger>
        <MenuContent>
          <PickerContents
            library={library}
            tracks={tracks}
            defaultName={defaultName}
            query={query}
          />
        </MenuContent>
      </MenuSubmenuRoot>
    </MenuFilterProvider>
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
  const { library, onOpenChange, filter, query } = usePicker();
  return (
    <MenuFilterProvider {...filter}>
      <MenuRoot onOpenChange={onOpenChange}>
        <MenuTrigger className={className}>
          <ListPlusIcon className="size-4 text-text-muted" aria-hidden />
          Add to Playlist
        </MenuTrigger>
        <MenuContent align="start">
          <PickerContents
            library={library}
            tracks={tracks}
            defaultName={defaultName}
            query={query}
          />
        </MenuContent>
      </MenuRoot>
    </MenuFilterProvider>
  );
}
