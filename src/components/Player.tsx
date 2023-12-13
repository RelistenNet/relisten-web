'use client';

import Head from 'next/head';
import Link from 'next/link';
import React, { useRef, useState } from 'react';

import { useSelector } from 'react-redux';
import player from '../lib/player';
import { durationToHHMMSS, removeLeadingZero, splitShowDate } from '../lib/utils';
import Flex from './Flex';

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
    const height = e.currentTarget.offsetHeight;
    const nextVolume = (height - e.pageY) / height;

    setVolume(nextVolume);

    player.setVolume(nextVolume);

    localStorage.volume = nextVolume;
  };

  return (
    <Flex className="content relative h-[50px] flex-1">
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
          className="playpause cursor-pointer items-center justify-center text-gray-600 active:text-gray-800 lg:w-[50px]"
          onClick={() => player.togglePlayPause()}
        >
          <i
            className={`fas fa cursor-pointer fa-${
              playback.activeTrack.isPaused ? 'play' : 'pause'
            }`}
          />
        </Flex>
      )}
      {typeof window === 'undefined' || !activeTrack ? null : (
        <div className="relative h-full flex-1" ref={playerRef}>
          <Flex className="info h-full justify-center transition-all duration-[1s] ease-in-out">
            <div className="timing absolute left-[8px] top-1/2 translate-x-0 translate-y-[-50%] text-left text-[0.8em] text-gray-600">
              <div>
                <i
                  className="fa fa-backward cursor-pointer"
                  onClick={() => player.playPrevious()}
                />
              </div>
              <div>{durationToHHMMSS(playback.activeTrack.currentTime)}</div>
            </div>
            <Flex column className="justify-around py-2">
              <div className="song-title relative text-[1em] text-gray-900">
                {activeTrack.title}
                {false && (
                  <Flex className="absolute left-full top-[2px] ml-2 w-full items-center text-[0.8em] text-gray-600">
                    <div>Next: {nextTrack && nextTrack.title}&nbsp;</div>
                    <i className="fa fa-angle-down cursor-pointer" />
                  </Flex>
                )}
              </div>

              <Link
                href="/"
                as={`/${artistSlug}/${year}/${month}/${day}?source=${source}`}
                legacyBehavior
              >
                <a className="band-title justify-center text-[0.8em] text-gray-600">
                  {artistName} – {removeLeadingZero(month)}/{removeLeadingZero(day)}/{year.slice(2)}
                </a>
              </Link>
            </Flex>
            <div className="timing duration absolute right-[8px] top-1/2 translate-x-0 translate-y-[-50%] text-right text-[0.8em] text-gray-600">
              <div>
                <i className="fa fa-forward cursor-pointer" onClick={() => player.playNext()} />
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
            className="absolute bottom-0 left-0 z-[1] h-1 w-full cursor-pointer bg-[#bcbcbc]"
            onClick={onProgressClick}
            style={{ opacity: playback.activeTrack.currentTime < 0.1 ? 0.8 : 1 }}
          >
            <div
              className="absolute bottom-0 left-0 h-1 bg-[#707070]"
              style={{ width: notchPosition ? notchPosition + 2 : 'auto' }}
            />
            <div
              className="absolute bottom-0 left-0 z-[1] h-2 w-[3px] bg-black"
              style={{ transform: `translate(${notchPosition}px, 0)` }}
            />
          </div>
          <div
            className="absolute right-[-6px] top-0 h-full w-[6px] bg-[#0000001a]"
            onClick={updateVolume}
          >
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 bg-[#707070]"
              style={{
                top: `${(1 - volume) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {activeTrack && (
        <Link
          href="/"
          as={`/${artistSlug}/${year}/${month}/${day}?source=${source}`}
          legacyBehavior
        >
          <div className="w-[50px] cursor-pointer items-center justify-center self-center text-gray-600 active:text-gray-800 max-lg:hidden">
            <i className="fa fa fa-list-ol cursor-pointer" />
          </div>
        </Link>
      )}
    </Flex>
  );
};

export default Player;
