'use client';

import type { ReactNode } from 'react';
import type { PlayableTrack } from '@/domain/types';
import EntryProgress from '@/player/EntryProgress';
import { useQueue } from '@/player/hooks';
import { useEntryElapsed } from '@/player/useEntryElapsed';
import PlayTrackButton, { PlayTrackRow } from '@/player/PlayTrackButton';
import QueueButtons from '@/player/QueueButtons';
import QueueMenu from '@/player/QueueMenu';
import cn from '@/lib/cn';
import { durationToHHMMSS } from '@/lib/utils';
import { songRowItem, type SongRowSource } from '@/player/queue/items';

/** What a card's player reads of its entry: the track, its show, the entry's queue key. */
export type CardEntry = SongRowSource & { queueKey: string; track: PlayableTrack };

/**
 * A track card's player parts, around what the server rendered (`children`: the
 * title, length, show line and note): the click-anywhere area and play button, the
 * queue buttons and menu, and the progress bar. One client component per card,
 * so the entry crosses to the browser once, not once per part (a long playlist's
 * page would otherwise outgrow its payload).
 */
export default function TrackCardPlayer({
  entry,
  name,
  length,
  menu,
  children,
}: {
  entry: CardEntry;
  /** "Scarlet Begonias, 1977-05-08": what its buttons are labeled for. */
  name: string;
  /** The track's length in seconds, under the play button. */
  length?: number;
  /** The editor's menu in the queue menu's place. */
  menu?: ReactNode;
  children: ReactNode;
}) {
  const item = songRowItem(entry);
  return (
    <>
      <PlayTrackRow row={entry} track={entry.track} />
      {/* The length under the play button, or where playback is while it's the
      current track: it may run wider than the button, centered on it. */}
      <div className="flex w-play-button shrink-0 flex-col items-center">
        <PlayTrackButton row={entry} track={entry.track} label={`Play ${name}`} />
        <ElapsedOrLength queueKey={entry.queueKey} length={length} />
      </div>
      {children}
      {/* Stretched to the card's height, for the length at its foot while it plays. */}
      <div className="relative shrink-0 self-stretch">
        <div className="flex items-center gap-1">
          {entry.track.mp3Url && (
            <QueueButtons
              item={item}
              name={name}
              className={`
              opacity-0 transition-opacity group-focus-within/cell:opacity-100
              group-hover/cell:opacity-100 max-sm:hidden
            `}
            />
          )}
          {/* Faded until the row is hovered or focused (or its menu is open); always
        shown on touch screens, which can't hover. The editor's menu takes its place. */}
          {menu ?? (
            <QueueMenu
              item={item}
              name={name}
              className={`
              opacity-0 transition-opacity group-focus-within/cell:opacity-100
              group-hover/cell:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100
            `}
            />
          )}
        </div>
        <PlayingLength queueKey={entry.queueKey} length={length} />
      </div>
      {/* Clipped to the card's corners. Only the scrubber takes pointer events. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <EntryProgress
          queueKey={entry.queueKey}
          title={entry.track.title ?? 'track'}
          fallbackDuration={entry.track.duration ?? undefined}
        />
      </div>
    </>
  );
}

const fmt = (seconds: number | undefined) =>
  seconds ? durationToHHMMSS(Math.round(seconds)) : '—';

/** The track's length, or, while it's the current track, where playback is in it. */
function ElapsedOrLength({ queueKey, length }: { queueKey: string; length?: number }) {
  const elapsed = useEntryElapsed(queueKey);
  return (
    <span
      className={cn(
        'text-[11px] leading-tight whitespace-nowrap tabular-nums',
        elapsed === null ? 'text-text-muted' : 'font-medium text-accent'
      )}
    >
      {elapsed === null ? fmt(length) : durationToHHMMSS(elapsed)}
    </span>
  );
}

/** While it's the current track, its length at the card's foot, at the progress bar's end. */
function PlayingLength({ queueKey, length }: { queueKey: string; length?: number }) {
  const isCurrent = useQueue((q) => q.current?.key === queueKey);
  if (!isCurrent) return null;
  return (
    <span className="absolute right-1.5 bottom-0 text-[11px] leading-tight whitespace-nowrap text-text-muted tabular-nums">
      {fmt(length)}
    </span>
  );
}
