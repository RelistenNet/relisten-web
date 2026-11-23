'use client';

import { Command } from 'cmdk';
import { CheckIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { Suspense, use, useState } from 'react';
import cn from '@/lib/cn';
import { MIN_QUERY_LENGTH, type SearchHit, type SearchResults } from '@/lib/search';
import { normalizeQuery, useSearchRequest } from '@/lib/useSearchRequest';
import { durationToHHMMSS } from '@/lib/utils';

// Add Tracks, in the editor's composer: search the catalog for tracks (a song
// and a year, a venue, a tour: "twist 1997") and add one with a click or Enter,
// which clears it, ready for the next, the search still focused. Escape or Done
// closes it. The request is the nav bar search's (useSearchRequest),
// scoped to shows, whose results are performances: each names the track its
// recording plays, which is what a playlist entry holds.
//
// It's laid out as the playlist's next card, empty: the search icon where a play
// button is, the query where a title is. Its results drop down over the rows
// below (so nothing moves as they come and go) and read as the cards they'd add.

/** A search hit a playlist can take: a track result, with its track. */
type TrackHit = SearchHit & { trackId: string };

const trackHits = (results: SearchResults): TrackHit[] =>
  results.results.filter((h): h is TrackHit => h.kind === 'performance' && !!h.trackId);

/** A card's columns: the play button's (an icon here), then the title's. */
const CARD = 'flex gap-card-gap pr-1.5 pl-card-x';
const PLAY_COLUMN = 'flex w-play-button shrink-0 items-center justify-center';

export default function AddTracks({
  inPlaylist,
  onAdd,
  onClose,
}: {
  /** Whether the playlist already has this track (it can hold one twice). */
  inPlaylist: (trackId: string) => boolean;
  /** Adds it; false if it didn't go in. */
  onAdd: (trackId: string) => boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const { request, isPending } = useSearchRequest(query, 'shows');
  // The highlighted row belongs to the results it was chosen in (as in GlobalSearch).
  const [selection, setSelection] = useState({ query: '', value: '' });
  const typed = query.trim();
  const selected = request && selection.query === request.query ? selection.value : '';

  return (
    <Command
      shouldFilter={false}
      loop
      label="Add tracks"
      value={selected}
      onValueChange={(value) => request && setSelection({ query: request.query, value })}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      // The results show while the search has focus: clicking elsewhere puts them away.
      className="group/picker relative"
    >
      <div
        className={cn(
          CARD,
          `
            items-center rounded-xl border border-dashed border-text-primary/15 py-card-y
            transition-colors focus-within:border-solid focus-within:border-accent/60
          `
        )}
      >
        <span className={cn(PLAY_COLUMN, 'h-7 text-text-muted')}>
          <SearchIcon aria-hidden className="size-4" />
        </span>
        <Command.Input
          placeholder="Search tracks: a song, and a year or venue"
          value={query}
          onValueChange={setQuery}
          autoFocus
          className="
            h-7 min-w-0 flex-1 bg-transparent text-[15px] text-text-primary outline-none
            placeholder:text-text-muted
          "
        />
        <button
          type="button"
          onClick={onClose}
          className="
            shrink-0 rounded-md px-2.5 py-1 text-sm font-medium text-text-secondary
            hover:bg-surface-hover hover:text-text-primary
          "
        >
          Done
        </button>
      </div>
      {typed.length >= MIN_QUERY_LENGTH && (
        <Command.List
          // A press on a result keeps the focus in the search, so the results stay
          // up until the click lands on one.
          onMouseDown={(e) => e.preventDefault()}
          className="
            absolute inset-x-0 top-full z-30 mt-1 hidden max-h-[min(24rem,55dvh)] scroll-py-1
            overflow-y-auto overscroll-contain rounded-xl bg-surface-raised p-1 shadow-lg ring-1
            ring-hairline group-focus-within/picker:block
          "
        >
          {!request ? (
            <Message>Searching…</Message>
          ) : (
            <Suspense fallback={<Message>Searching…</Message>}>
              {/* Not the box's results: faded while typing pauses and the new request loads. */}
              <div
                className={cn(
                  'transition-opacity duration-150',
                  (isPending || request.query !== normalizeQuery(query)) && 'opacity-50'
                )}
              >
                {/* A new result set is new rows, so cmdk highlights its first. */}
                <Results
                  key={request.query}
                  results={request.results}
                  inPlaylist={inPlaylist}
                  onSelect={(trackId) => {
                    // Added: cleared for the next (the results go with the query).
                    if (onAdd(trackId)) setQuery('');
                  }}
                />
              </div>
            </Suspense>
          )}
        </Command.List>
      )}
    </Command>
  );
}

function Results({
  results: request,
  inPlaylist,
  onSelect,
}: {
  results: Promise<SearchResults>;
  inPlaylist: (trackId: string) => boolean;
  onSelect: (trackId: string) => void;
}) {
  const results = use(request);
  if (results.availability === 'unavailable')
    return <Message>Search isn’t available right now.</Message>;
  const hits = trackHits(results);
  if (!hits.length)
    return <Message>No tracks match. Try a song with a year or a venue: “twist 1997”.</Message>;
  return (
    <Command.Group
      heading={results.chips.length ? results.chips.join(' · ') : undefined}
      className="
        **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:pt-1.5
        **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-xs
        **:[[cmdk-group-heading]]:text-text-muted
      "
    >
      {hits.map((hit) => (
        <TrackResult
          key={hit.id}
          hit={hit}
          added={inPlaylist(hit.trackId)}
          onSelect={() => onSelect(hit.trackId)}
        />
      ))}
    </Command.Group>
  );
}

/** A result as the card it would add: title and length, then where it's from. */
function TrackResult({
  hit,
  added,
  onSelect,
}: {
  hit: TrackHit;
  added: boolean;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={hit.id}
      onSelect={onSelect}
      className={cn(
        CARD,
        'cursor-pointer items-start rounded-lg py-2 data-[selected=true]:bg-surface-hover'
      )}
    >
      <span className={cn(PLAY_COLUMN, 'h-[22px]')}>
        {added ? (
          <CheckIcon aria-hidden className="size-4 text-accent" />
        ) : (
          <PlusIcon
            aria-hidden
            className="size-4 text-text-muted in-data-[selected=true]:text-accent"
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[15px] leading-snug font-medium text-text-primary">
            {hit.title}
          </span>
          {hit.soundboard && (
            <span
              className="
                shrink-0 self-center rounded-xs border border-hairline px-1 text-[10px] leading-4
                font-medium text-text-muted
              "
            >
              SBD
            </span>
          )}
          {hit.duration && (
            <span className="shrink-0 text-[13px] text-text-muted tabular-nums">
              {durationToHHMMSS(hit.duration)}
            </span>
          )}
        </span>
        <span className="truncate text-[13px] text-text-muted">
          {added && <span className="text-accent">In playlist · </span>}
          {hit.detail.join(' · ')}
        </span>
      </span>
    </Command.Item>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <p className="mb-0 px-3 py-4 text-sm text-text-muted">{children}</p>;
}
