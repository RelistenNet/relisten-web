'use client';

import { href } from '@timber-js/app/routes';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { Link } from '@timber-js/app/client';
import React, { Suspense, use, useRef, useState } from 'react';
import { browser } from 'react-dom';

import { FastForwardIcon, ListMusicIcon, PauseIcon, PlayIcon, RewindIcon } from 'lucide-react';
import { next, previous, seek, setVolume as setPlayerVolume, togglePlayPause } from './commands';
import { useCurrentItem, useIsPlaying, usePlayback } from './hooks';
import { durationToHHMMSS, removeLeadingZero, splitShowDate } from '@/lib/utils';
import Flex from '@/ui/base/Flex';

/** Seconds into the playing track, or 0. */
const useCurrentTime = () => usePlayback((p) => p.currentTime);
/** The playing track's length: the file's once known, else the item's. */
function useDuration(fallback: number | undefined) {
  const duration = usePlayback((p) => p.duration);
  return Number.isFinite(duration) && duration > 0 ? duration : (fallback ?? 0);
}

function Elapsed() {
  return <div>{durationToHHMMSS(useCurrentTime())}</div>;
}

function Remaining({ fallback }: { fallback?: number }) {
  const [showRemaining, setShowRemaining] = useState(false);
  const currentTime = usePlayback((p) => (showRemaining ? p.currentTime : 0));
  const duration = useDuration(fallback);
  return (
    <div onClick={() => setShowRemaining((r) => !r)} className="cursor-pointer">
      {durationToHHMMSS(showRemaining ? currentTime - duration : duration)}
    </div>
  );
}

function Progress({ fallback }: { fallback?: number }) {
  const currentTime = useCurrentTime();
  const duration = useDuration(fallback);
  const percent = duration ? currentTime / duration : 0;
  const hoverTextRef = useRef<HTMLSpanElement>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    e.currentTarget.style.setProperty('--hover-x', `${x}px`);
    if (hoverTextRef.current) {
      hoverTextRef.current.textContent = durationToHHMMSS((x / rect.width) * duration);
    }
  };

  return (
    <div
      className="
        group absolute bottom-0 left-0 z-1 h-1 w-full cursor-pointer touch-none bg-hairline
        before:absolute before:-top-2 before:left-0 before:h-3 before:w-full
        before:content-['']
      "
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      style={{ opacity: currentTime < 0.1 ? 0.8 : 1 }}
    >
      <div
        className="absolute bottom-0 left-0 h-1 bg-accent"
        style={{ width: `${percent * 100}%` }}
      />
      <div
        className="absolute bottom-0 left-0 z-1 h-2 w-[3px] bg-text-primary"
        style={{ left: `${percent * 100}%` }}
      />
      <div
        className="
          pointer-events-none absolute bottom-full z-2 mb-2 hidden -translate-x-1/2 rounded-md
          bg-surface-raised px-2.5 py-1 text-xs text-text-primary tabular-nums shadow-lg
          ring-1 ring-hairline group-hover:block
        "
        style={{ left: 'var(--hover-x)' }}
      >
        <span ref={hoverTextRef} />
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-raised" />
      </div>
    </div>
  );
}

function PlayerInner() {
  use(browser());

  const activeTrack = useCurrentItem();
  const isPlaying = useIsPlaying();
  const volume = usePlayback((p) => p.volume);

  const { year, month, day } = splitShowDate(activeTrack?.date);
  const artistSlug = activeTrack?.artistSlug;
  // The playing show's page, on the playing tape.
  const showHref =
    artistSlug && year && month && day
      ? href(
          '/[artistSlug]/[year]/[month]/[day]',
          { artistSlug, year, month, day },
          sourceQuery(activeTrack?.sourceId)
        )
      : href('/');
  const artistName = activeTrack?.artistName;

  const updateVolume = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nextVolume = Math.max(
      0,
      Math.min(1, (rect.height - (e.clientY - rect.top)) / rect.height)
    );
    setPlayerVolume(nextVolume);
  };

  return (
    <Flex
      key={activeTrack ? 'active' : 'empty'}
      className={`relative content h-[50px] flex-1 ${
        activeTrack
          ? 'animate-in duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] fade-in motion-reduce:animate-none'
          : ''
      }`}
    >
      {activeTrack && (
        <Flex
          className="
            playpause min-w-[44px] cursor-pointer items-center justify-center text-text-muted
            active:text-text-primary lg:w-[40px] lg:min-w-0
          "
          onClick={() => togglePlayPause()}
        >
          {!isPlaying ? (
            <PlayIcon
              size={20}
              className="fas fa fa-play fill-text-muted active:fill-text-primary"
            />
          ) : (
            <PauseIcon
              size={20}
              className="fas fa fa-pause fill-text-muted active:fill-text-primary"
            />
          )}
        </Flex>
      )}
      {activeTrack && (
        <div className="relative h-full flex-1">
          <Flex className="info h-full justify-center transition-all duration-[1s] ease-in-out">
            <div
              className="
              timing absolute top-1/2 left-[8px] translate-x-0 translate-y-[-50%] text-left
              text-[0.8em] text-text-muted
            "
            >
              <div className="-m-2 cursor-pointer p-2" onClick={() => previous()}>
                <RewindIcon className="fill-text-muted" size={16} />
              </div>
              <Elapsed />
            </div>
            <Flex column className="justify-center pb-1">
              <div className="song-title relative top-1 text-center text-[1em] text-text-primary">
                {activeTrack.title}
              </div>

              <Link
                href={showHref}
                className="band-title justify-center text-center text-[0.8em] text-text-muted"
              >
                {artistName} – {removeLeadingZero(month)}/{removeLeadingZero(day)}/{year.slice(2)}
              </Link>
            </Flex>
            <div
              className="
              timing duration absolute top-1/2 right-[8px] translate-x-0 translate-y-[-50%]
              text-right text-[0.8em] text-text-muted
            "
            >
              <div className="-m-2 cursor-pointer p-2" onClick={() => next()}>
                <FastForwardIcon className="fill-text-muted" size={16} />
              </div>
              <Remaining fallback={activeTrack.duration} />
            </div>
          </Flex>
          <Progress fallback={activeTrack.duration} />
        </div>
      )}
      {activeTrack && (
        <div className="volume-control">
          <div
            className="relative h-full w-[6px] cursor-pointer touch-none bg-hairline"
            onPointerDown={updateVolume}
          >
            <div
              className="pointer-events-none absolute right-0 bottom-0 left-0 bg-text-muted"
              style={{
                height: `${volume * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {activeTrack && (
        <Link
          href={showHref}
          className="
            flex w-[40px] cursor-pointer items-center justify-center self-center text-text-muted
            active:text-text-primary max-lg:hidden
          "
        >
          <div>
            <ListMusicIcon size={22} />
          </div>
        </Link>
      )}
    </Flex>
  );
}

const Player = () => (
  <Suspense fallback={<div className="h-[50px]" />}>
    <PlayerInner />
  </Suspense>
);

export default Player;
