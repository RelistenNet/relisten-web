'use client';

import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react';
import { durationToHHMMSS } from '@/lib/utils';
import { seek } from './commands';
import { readPlayback, usePlayback, usePlaybackFrame, useQueue } from './hooks';

const KEY_STEP = 5; // seconds per arrow key

/**
 * A queue entry's progress along the bottom of its row (a playlist's track
 * cell), while it's the current entry: a scrubber. Click or drag to seek (the
 * seek happens on release, so a drag doesn't seek on every move); arrow keys
 * step 5s, Home/End go to the ends. Place it in a positioned parent.
 */
export default function EntryProgress({
  queueKey,
  title,
  fallbackDuration,
}: {
  queueKey: string;
  /** For screen readers: "Seek <title>". */
  title: string;
  /** The catalog's length, until the file's is known. */
  fallbackDuration?: number;
}) {
  const isCurrent = useQueue((q) => q.current?.key === queueKey);
  // Whole seconds, for the slider's value: renders once a second. The fill is
  // painted per frame instead (usePlaybackFrame).
  const second = usePlayback((p) => (isCurrent ? Math.round(p.currentTime) : 0));
  const fileDuration = usePlayback((p) => (isCurrent ? p.duration : 0));
  const duration =
    Number.isFinite(fileDuration) && fileDuration > 0 ? fileDuration : (fallbackDuration ?? 0);
  // Where a drag is, until it's released: ephemeral, so local state.
  const [dragging, setDragging] = useState<number | null>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  usePlaybackFrame((p) => {
    if (!fillRef.current || !duration) return;
    fillRef.current.style.width = `${Math.min(1, (dragging ?? p.currentTime) / duration) * 100}%`;
  });
  if (!isCurrent || !duration) return null;

  const at = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * duration;
  };
  const shown = Math.round(dragging ?? second);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const time = readPlayback().currentTime;
    const target =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? time + KEY_STEP
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? time - KEY_STEP
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? duration - 1
              : null;
    if (target === null) return;
    e.preventDefault();
    seek(Math.min(duration, Math.max(0, target)));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={`Seek ${title}`}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={shown}
      aria-valuetext={`${durationToHHMMSS(shown)} of ${durationToHHMMSS(Math.round(duration))}`}
      // A 12px hit area along the bottom edge; the line itself is 2px (4px on hover).
      className="
        group/seek pointer-events-auto absolute inset-x-0 bottom-0 z-10 h-3 cursor-pointer
        touch-none outline-none
      "
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(at(e));
      }}
      onPointerMove={(e) => dragging !== null && setDragging(at(e))}
      onPointerUp={(e) => {
        if (dragging === null) return;
        seek(at(e));
        setDragging(null);
      }}
      onPointerCancel={() => setDragging(null)}
      onKeyDown={onKeyDown}
    >
      <div
        className={`
          absolute inset-x-0 bottom-0 h-0.5 bg-hairline transition-[height]
          group-hover/seek:h-1 group-focus-visible/seek:h-1 group-active/seek:h-1
        `}
      >
        <div ref={fillRef} className="h-full bg-accent" />
      </div>
    </div>
  );
}
