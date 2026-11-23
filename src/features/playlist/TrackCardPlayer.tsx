'use client';

import type { ReactNode } from 'react';
import type { PlayableTrack } from '@/domain/types';
import EntryProgress from '@/player/EntryProgress';
import PlayTrackButton, { PlayTrackRow } from '@/player/PlayTrackButton';
import QueueButtons from '@/player/QueueButtons';
import QueueMenu from '@/player/QueueMenu';
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
  menu,
  children,
}: {
  entry: CardEntry;
  /** "Scarlet Begonias, 1977-05-08": what its buttons are labeled for. */
  name: string;
  /** The editor's menu in the queue menu's place. */
  menu?: ReactNode;
  children: ReactNode;
}) {
  const item = songRowItem(entry);
  return (
    <>
      <PlayTrackRow row={entry} track={entry.track} />
      <PlayTrackButton row={entry} track={entry.track} label={`Play ${name}`} />
      {children}
      <div className="flex shrink-0 items-center gap-1">
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
