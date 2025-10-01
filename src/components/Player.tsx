'use client';

import Head from 'next/head';
import Link from 'next/link';
import React, { useRef, useState } from 'react';

import { useSelector } from 'react-redux';
import player from '../lib/player';
import { durationToHHMMSS, removeLeadingZero, splitShowDate } from '../lib/utils';
import Flex from './Flex';
import {
  AlertCircle,
  ChevronDown,
  FastForwardIcon,
  ListMusicIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  Volume2Icon,
} from 'lucide-react';
import { Toaster } from 'sonner';

interface Props {
  artistSlugsToName: Record<string, string | undefined>;
}

const Player = ({ artistSlugsToName }: Props) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playback = useSelector((state: any) => state.playback);
  const [showRemainingDuration, setShowRemainingDuration] = useState(false);
  const [volume, setVolume] = useState(
    (typeof localStorage !== 'undefined' && localStorage.volume) || 1
  );

  const { year, month, day } = splitShowDate(playback.showDate);
  const { artistSlug, source } = playback;
  const artistName = artistSlugsToName[artistSlug];
  const activeTrack = playback.tracks.find(
    (track, idx: number) => idx === playback.activeTrack.idx
  );
  const nextTrack = playback.tracks.find(
    (track, idx: number) => idx === playback.activeTrack.idx + 1
  );
  const notchPosition =
    typeof window === 'undefined' || !playerRef
      ? 0
      : (playback.activeTrack.currentTime / playback.activeTrack.duration) *
        (Number(playerRef.current?.clientWidth) - 3);

  const onProgressClick = (e: React.MouseEvent) => {
    const rect = playerRef.current?.getBoundingClientRect();

    if (!rect) return;

    const percentage = (e.pageX - rect?.left) / rect?.width;

    player.currentTrack.seek(percentage * (playback?.activeTrack?.duration ?? 0));
  };

  const toggleRemainingDuration = () => {
    setShowRemainingDuration((t) => !t);
  };

  const updateVolume = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const height = rect.height;
    const nextVolume = (height - (e.pageY - rect.top)) / height;

    setVolume(Math.max(0, Math.min(1, nextVolume)));

    player.setVolume(Math.max(0, Math.min(1, nextVolume)));

    localStorage.volume = Math.max(0, Math.min(1, nextVolume));
  };

  return (
    <Flex className="content relative h-[50px] flex-1 px-2">
      {false && activeTrack && (
        <Head>
          <title>
            {`${playback.activeTrack.isPaused ? '❚❚' : '▶'} ${
              activeTrack.title
            } ${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(
              2
            )} ${artistName}`}{' '}
            | Relisten
          </title>
        </Head>
      )}
      {activeTrack && (
        <Flex
          className="playpause text-foreground-muted cursor-pointer items-center justify-center active:text-gray-800 lg:w-[40px]"
          onClick={() => player.togglePlayPause()}
        >
          {playback.activeTrack.isPaused ? (
            <PlayIcon size={20} className="fill-foreground-muted active:fill-gray-800" />
          ) : (
            <PauseIcon size={20} className="fill-foreground-muted active:fill-gray-800" />
          )}
        </Flex>
      )}
      {typeof window === 'undefined' || !activeTrack ? null : (
        <div className="relative h-full flex-1" ref={playerRef}>
          <Flex className="info h-full justify-center transition-all duration-[1s] ease-in-out">
            <div className="timing text-foreground-muted absolute top-1/2 left-[8px] translate-x-0 translate-y-[-50%] text-left text-[0.8em]">
              <div>
                <RewindIcon
                  className="fill-foreground-muted cursor-pointer"
                  onClick={() => player.playPrevious()}
                  size={16}
                />
              </div>
              <div>{durationToHHMMSS(playback.activeTrack.currentTime)}</div>
            </div>
            <Flex column className="justify-center pb-1">
              <div className="song-title relative top-1 text-center text-[1em] text-foreground">
                {activeTrack.title}
                {false && (
                  <Flex className="text-foreground-muted absolute top-[2px] left-full ml-2 w-full items-center text-[0.8em]">
                    <div>Next: {nextTrack && nextTrack.title}&nbsp;</div>
                    <ChevronDown size={12} className="cursor-pointer" />
                  </Flex>
                )}
              </div>

              <Link
                href="/"
                as={`/${artistSlug}/${year}/${month}/${day}?source=${source}`}
                className="band-title text-foreground-muted justify-center text-center text-[0.8em]"
              >
                {artistName} – {removeLeadingZero(month)}/{removeLeadingZero(day)}/{year.slice(2)}
              </Link>
            </Flex>
            <div className="timing duration text-foreground-muted absolute top-1/2 right-[8px] translate-x-0 translate-y-[-50%] text-right text-[0.8em]">
              <div>
                <FastForwardIcon
                  className="fill-foreground-muted ml-auto cursor-pointer"
                  onClick={() => player.playNext()}
                  size={16}
                />
              </div>
              <div onClick={toggleRemainingDuration} className="cursor-pointer">
                {durationToHHMMSS(
                  showRemainingDuration
                    ? playback.activeTrack.currentTime - playback.activeTrack.duration
                    : playback.activeTrack.duration
                )}
              </div>
            </div>
          </Flex>
          <div
            className="absolute bottom-0 left-0 z-1 h-1 w-full cursor-pointer bg-progress-bg"
            onClick={onProgressClick}
            style={{ opacity: playback.activeTrack.currentTime < 0.1 ? 0.8 : 1 }}
          >
            <div
              className="absolute bottom-0 left-0 h-1 bg-progress-fg"
              style={{ width: notchPosition ? notchPosition + 2 : 'auto' }}
            />
            <div
              className="absolute bottom-0 left-0 z-1 h-2 w-[3px] bg-foreground"
              style={{ transform: `translate(${notchPosition}px, 0)` }}
            />
          </div>
        </div>
      )}
      {activeTrack && (
        <div className="volume-control">
          <div
            className="relative h-full w-[6px] cursor-pointer bg-progress-bg/20"
            onClick={updateVolume}
          >
            <div
              className="pointer-events-none absolute right-0 bottom-0 left-0 bg-progress-fg"
              style={{
                height: `${volume * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {activeTrack && (
        <Link
          href="/"
          as={`/${artistSlug}/${year}/${month}/${day}?source=${source}`}
          className="text-foreground-muted flex w-[40px] cursor-pointer items-center justify-center self-center active:text-gray-800 max-lg:hidden"
        >
          <div>
            <ListMusicIcon size={22} />
          </div>
        </Link>
      )}
    </Flex>
  );
};

export default Player;
