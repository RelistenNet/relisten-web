'use client';

import {
  CheckIcon,
  ListEndIcon,
  ListStartIcon,
  LoaderCircleIcon,
  type LucideIcon,
  Pause,
  Play,
} from 'lucide-react';
import { type ReactNode, useDeferredValue, useState, useTransition, ViewTransition } from 'react';
import { toast } from 'sonner';
import cn from '@/lib/cn';
import Tooltip from '@/ui/base/Tooltip';
import {
  addToQueue,
  playNext,
  playShowById,
  playSongRows,
  queueShow,
  togglePlayPause,
} from './commands';
import { useCurrentItem, useIsPlaying } from './hooks';
import type { QueueItem } from './queue/model';
import { useSongQueue } from './SongQueue';

/** What a row queues: one track, or a whole show (its tracks fetched on click). */
export type QueueTarget = { item: QueueItem | null } | { showId: string };

const SHOW_FAILED = "Couldn't load that show";

/**
 * Play next / Add to queue as inline buttons, beside a row's play button (the
 * menu's actions, a click closer). Each shows a check briefly once it has queued.
 */
export default function QueueButtons({
  name,
  className,
  ...target
}: QueueTarget & {
  /** For screen readers: "Play next: <name>". */
  name: string;
  className?: string;
}) {
  if ('item' in target && !target.item) return null;
  const run = (where: 'next' | 'end') => async () => {
    if ('showId' in target) {
      const ok = await queueShow(target.showId, where);
      if (!ok) toast.error(SHOW_FAILED);
      return ok;
    }
    if (target.item) (where === 'next' ? playNext : addToQueue)([target.item]);
    return true;
  };
  return (
    <span className={cn('inline-flex items-center', className)}>
      <QueueButton icon={ListStartIcon} label="Play Next" name={name} onClick={run('next')} />
      <QueueButton icon={ListEndIcon} label="Add to Queue" name={name} onClick={run('end')} />
    </span>
  );
}

const BUTTON = `
  inline-flex rounded-full p-1.5 hover:bg-surface-hover focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait
`;

/**
 * A queueing click: pending (a transition) while it loads, then `flash` counts
 * up on success. Keyed by it, <Queued> replays its check animation, so no timer.
 */
function useQueueAction(action: () => boolean | Promise<boolean>) {
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState(0);
  const run = () =>
    startTransition(async () => {
      if (await action()) setFlash((n) => n + 1);
    });
  return { isPending, flash, run };
}

/** `idle`, swapped for `done` for a moment after each success (CSS only). Stacked, so nothing shifts. */
function Queued({ flash, idle, done }: { flash: number; idle: ReactNode; done: ReactNode }) {
  return (
    <span key={flash} className="inline-grid *:col-start-1 *:row-start-1">
      <span className={cn('inline-flex items-center gap-1.5', flash > 0 && 'animate-queued-out')}>
        {idle}
      </span>
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center gap-1.5 opacity-0',
          flash > 0 && 'animate-queued-in'
        )}
      >
        {done}
      </span>
    </span>
  );
}

function QueueButton({
  icon: Icon,
  label,
  name,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  /** False: nothing was queued (no check). */
  onClick: () => Promise<boolean>;
}) {
  const { isPending, flash, run } = useQueueAction(onClick);
  return (
    <Tooltip content={label} align="top">
      <button
        type="button"
        aria-label={`${label}: ${name}`}
        disabled={isPending}
        onClick={run}
        className={cn(BUTTON, 'text-text-muted hover:text-text-primary')}
      >
        <Queued
          flash={flash}
          idle={
            isPending ? (
              <LoaderCircleIcon className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Icon className="size-4 shrink-0" aria-hidden />
            )
          }
          done={<CheckIcon className="size-4 shrink-0 text-accent" />}
        />
      </button>
    </Tooltip>
  );
}

/**
 * Plays a whole show from a shows table (its first tape, from the top),
 * replacing the queue. While it's the show playing, it pauses and resumes.
 */
export function PlayShowButton({ showId, name }: { showId: string; name: string }) {
  const isCurrent = useCurrentItem()?.showId === showId;
  const isPlaying = useIsPlaying() && isCurrent;
  const [pending, startTransition] = useTransition();

  const play = () => {
    if (isCurrent) return togglePlayPause();
    startTransition(async () => {
      if (!(await playShowById(showId))) toast.error(SHOW_FAILED);
    });
  };

  const Icon = pending ? LoaderCircleIcon : isPlaying ? Pause : Play;
  const button = (
    <button
      type="button"
      onClick={play}
      disabled={pending}
      aria-label={`${isPlaying ? 'Pause' : 'Play'} ${name}`}
      aria-pressed={isCurrent}
      className={cn(BUTTON, 'text-accent')}
    >
      <Icon className={cn('size-4 shrink-0', pending && 'animate-spin')} aria-hidden />
    </button>
  );
  if (isCurrent) return button;
  return (
    <Tooltip content="Play (replaces queue)" align="top">
      {button}
    </Tooltip>
  );
}

const PILL = `
  inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-sm
  font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-accent
`;

/**
 * A show page's buttons for the tape on screen (the SongQueueProvider's rows): Play show (from the top,
 * replacing the queue; pauses and resumes while the tape is playing), Play
 * next and Add to queue for all of its tracks.
 *
 * A playlist's (`playlist`): Play playlist, current while one of its own
 * entries is (a track of the same tape played from elsewhere isn't).
 */
export function ShowQueueActions({ playlist = false }: { playlist?: boolean }) {
  const { label: queueLabel = '', items = [] } = useSongQueue() ?? {};
  // The player's store reads the same on the server and in the first client
  // render (nothing restored yet), so this hydrates as the idle button; when the
  // saved queue restores, the label changes in place.
  const current = useCurrentItem();
  const isCurrent =
    !!items[0] &&
    !!current &&
    (playlist ? items.some((i) => i.key === current.key) : current.sourceId === items[0].sourceId);
  const isPlaying = useIsPlaying() && isCurrent;
  const idle = playlist ? 'Play Playlist' : 'Play Show';
  const label = useDeferredValue(isPlaying ? 'Pause' : isCurrent ? 'Resume' : idle);
  if (!items[0]) return null;
  const start = items[0];

  const PlayIcon = isPlaying ? Pause : Play;
  const play = (
    <button
      type="button"
      onClick={() =>
        isCurrent
          ? togglePlayPause()
          : playSongRows({ items, label: queueLabel, startKey: start.key })
      }
      className={cn(PILL, 'border-transparent bg-accent/15 hover:bg-accent/25')}
    >
      <PlayIcon className="size-4 text-accent" aria-hidden />
      {/* Every label in one grid cell, hidden, to size the button to the widest:
      its width never changes. The shown label sits on top of them. */}
      <span className="inline-grid *:col-start-1 *:row-start-1">
        {[idle, 'Resume', 'Pause'].map((text) => (
          <span key={text} aria-hidden className="invisible">
            {text}
          </span>
        ))}
        {/* Deferred, so the swap commits as a transition and ViewTransition animates it
        (the player's store updates synchronously, which wouldn't animate). */}
        {/* label-roll (globals.css): the old label rotates away as the new one rolls in. */}
        <ViewTransition default="none" update="label-roll">
          <span>{label}</span>
        </ViewTransition>
      </span>
    </button>
  );
  return (
    <div className={cn('flex flex-wrap items-center', playlist ? 'gap-1' : 'gap-2')}>
      {/* Always the same wrapper, so the button keeps its identity (and its label
      animates) as it becomes current. */}
      <Tooltip content={isCurrent ? null : 'Replaces the queue'} align="top">
        {play}
      </Tooltip>
      <ShowQueuePill
        icon={ListStartIcon}
        text="Play Next"
        iconOnly={playlist}
        onClick={() => playNext(items)}
      />
      <ShowQueuePill
        icon={ListEndIcon}
        text="Add to Queue"
        iconOnly={playlist}
        onClick={() => addToQueue(items)}
      />
    </div>
  );
}

function ShowQueuePill({
  icon: Icon,
  text,
  iconOnly = false,
  onClick,
}: {
  icon: LucideIcon;
  text: string;
  /** Just the icon, the text as its label and tooltip (a playlist's quieter header). */
  iconOnly?: boolean;
  onClick: () => void;
}) {
  const { flash, run } = useQueueAction(() => {
    onClick();
    return true;
  });
  if (iconOnly) {
    return (
      <Tooltip content={text} align="top">
        <button
          type="button"
          onClick={run}
          aria-label={`${text}: all tracks`}
          className={cn(BUTTON, 'p-2 text-text-muted hover:text-text-primary')}
        >
          <Queued
            flash={flash}
            idle={<Icon className="size-4.5 shrink-0" aria-hidden />}
            done={<CheckIcon className="size-4.5 shrink-0 text-accent" />}
          />
        </button>
      </Tooltip>
    );
  }
  return (
    <button type="button" onClick={run} className={PILL}>
      <Queued
        flash={flash}
        idle={
          <>
            <Icon className="size-4 text-text-muted" aria-hidden />
            {text}
          </>
        }
        done={
          <>
            <CheckIcon className="size-4 text-accent" />
            Queued
          </>
        }
      />
    </button>
  );
}
