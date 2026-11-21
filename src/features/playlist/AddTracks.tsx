'use client';

import { ArrowLeftIcon, LinkIcon, MusicIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { Suspense, use, useDeferredValue, useRef, useState } from 'react';
import { durationToHHMMSS } from '@/lib/utils';
import { EMPTY_SEARCH, type SearchItem, type SearchResults } from '@/lib/search';
import { searchSearchParams } from '@/lib/searchParams/apiSearchParams';
import { formatShowDate } from '@/ui/shows/stats';
import { songPerformances, type TrackChoice, tracksAtUrl } from './addTracksActions';

// Add Tracks at a gap in the editor (RE-54): search for a song, then pick one of
// its performances; or paste a Relisten show or track link. Each lookup is a
// promise the list reads with use(); a newer one replaces it, and the previous
// answer stays up (useDeferredValue) until it lands.

const SEARCH_DELAY_MS = 250;
const MAX_SONGS = 8;

const looksLikeLink = (q: string) => /^(https?:\/\/|\/)/i.test(q.trim());

function searchSongs(q: string): Promise<SearchResults> {
  return fetch(searchSearchParams.href('/api/search', { q }))
    .then((res) => (res.ok ? (res.json() as Promise<SearchResults>) : EMPTY_SEARCH))
    .catch(() => EMPTY_SEARCH);
}

type Lookup =
  | { kind: 'songs'; q: string; results: Promise<SearchResults> }
  | { kind: 'link'; results: Promise<Awaited<ReturnType<typeof tracksAtUrl>>> };

export default function AddTracks({
  onAdd,
  onClose,
}: {
  /** Adds these tracks at the gap, in order, as one run. */
  onAdd: (trackIds: string[]) => void;
  onClose: () => void;
}) {
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [song, setSong] = useState<{ item: SearchItem; choices: Promise<TrackChoice[] | null> }>();
  const shown = useDeferredValue(lookup);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onQuery = (q: string) => {
    clearTimeout(timer.current);
    const query = q.trim();
    if (!query) return setLookup(null);
    timer.current = setTimeout(
      () =>
        setLookup(
          looksLikeLink(query)
            ? { kind: 'link', results: tracksAtUrl(query) }
            : { kind: 'songs', q: query, results: searchSongs(query) }
        ),
      SEARCH_DELAY_MS
    );
  };

  return (
    <div
      className="flex flex-col gap-2"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      {song ? (
        <>
          <button
            type="button"
            onClick={() => setSong(undefined)}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {song.item.name} · {song.item.artist.name}
          </button>
          <Suspense fallback={<Note>Loading performances…</Note>}>
            <Performances choices={song.choices} onAdd={(id) => onAdd([id])} />
          </Suspense>
        </>
      ) : (
        <>
          <label
            className="
            flex items-center gap-2 rounded-lg bg-surface-raised px-2.5 ring-1 ring-hairline
            focus-within:ring-accent
          "
          >
            <SearchIcon className="size-4 shrink-0 text-text-muted" aria-hidden />
            <input
              autoFocus
              aria-label="Search songs, or paste a Relisten link"
              placeholder="Search songs, or paste a Relisten link"
              onChange={(e) => onQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
            />
          </label>
          {shown && (
            <Suspense fallback={<Note>Searching…</Note>}>
              {shown.kind === 'link' ? (
                <LinkResult results={shown.results} onAdd={onAdd} />
              ) : (
                <SongResults
                  results={shown.results}
                  onPick={(item) =>
                    setSong({
                      item,
                      choices: songPerformances({
                        artistSlug: item.artist.slug,
                        songSlug: item.slug,
                      }),
                    })
                  }
                />
              )}
            </Suspense>
          )}
        </>
      )}
      <button
        type="button"
        onClick={onClose}
        className="w-fit text-xs text-text-muted hover:text-text-primary"
      >
        Cancel
      </button>
    </div>
  );
}

function Note({ children }: { children: string }) {
  return <p className="m-0 px-1 text-sm text-text-muted">{children}</p>;
}

const ROW = `
  flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm
  hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent
`;

function SongResults({
  results,
  onPick,
}: {
  results: Promise<SearchResults>;
  onPick: (item: SearchItem) => void;
}) {
  const { songs } = use(results);
  if (!songs.length) return <Note>No songs found.</Note>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {songs.slice(0, MAX_SONGS).map((s) => (
        <li key={`${s.artist.slug}/${s.slug}`} className="ml-0">
          <button type="button" className={ROW} onClick={() => onPick(s)}>
            <MusicIcon className="size-4 shrink-0 text-text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {s.name} <span className="text-text-muted">· {s.artist.name}</span>
            </span>
            <span className="shrink-0 text-xs text-text-muted tabular-nums">
              {s.show_count.toLocaleString()} shows
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Performances({
  choices,
  onAdd,
}: {
  choices: Promise<TrackChoice[] | null>;
  onAdd: (trackId: string) => void;
}) {
  const all = use(choices);
  const [filter, setFilter] = useState('');
  if (!all) return <Note>Couldn’t load its performances.</Note>;
  if (!all.length) return <Note>No playable performances.</Note>;
  const f = filter.trim().toLowerCase();
  const list = f ? all.filter((c) => `${c.date} ${c.venue ?? ''}`.toLowerCase().includes(f)) : all;
  return (
    <>
      <input
        autoFocus
        aria-label="Filter by year or venue"
        placeholder={`Filter ${all.length.toLocaleString()} performances by year or venue`}
        onChange={(e) => setFilter(e.target.value)}
        className="
          rounded-lg bg-surface-raised px-2.5 py-1.5 text-sm ring-1 ring-hairline outline-none
          focus:ring-accent
        "
      />
      <ul className="m-0 flex max-h-72 list-none flex-col overflow-y-auto p-0">
        {list.map((c) => (
          <li key={c.trackId} className="ml-0">
            <button type="button" className={ROW} onClick={() => onAdd(c.trackId)}>
              <PlusIcon className="size-4 shrink-0 text-text-muted" aria-hidden />
              <span className="shrink-0 tabular-nums">{formatShowDate(c.date)}</span>
              <span className="min-w-0 flex-1 truncate text-text-muted">{c.venue}</span>
              <span className="shrink-0 text-xs text-text-muted tabular-nums">
                {c.duration ? durationToHHMMSS(Math.round(c.duration)) : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function LinkResult({
  results,
  onAdd,
}: {
  results: Promise<Awaited<ReturnType<typeof tracksAtUrl>>>;
  onAdd: (trackIds: string[]) => void;
}) {
  const found = use(results);
  if (!found) return <Note>That link isn’t a Relisten show or track.</Note>;
  return (
    <button type="button" className={ROW} onClick={() => onAdd(found.tracks.map((t) => t.trackId))}>
      <LinkIcon className="size-4 shrink-0 text-text-muted" aria-hidden />
      <span className="min-w-0 flex-1 truncate">Add {found.label}</span>
    </button>
  );
}
