// @ts-nocheck

import React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import Head from 'next/head';
import Link from 'next/link';

import { durationToHHMMSS, removeLeadingZero, splitShowDate } from '../lib/utils';
import player from '../lib/player';
import { Artist, Meta, Playback } from '../types';
import Flex from './Flex';

type PlayerProps = {
  playback: Playback;
  // Leaving as 'any' since this prop is not use
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tapes?: any;
  artists: {
    data: Artist[];
    meta: Meta;
  };
};

type PlayerState = {
  showRemainingDuration: boolean;
  volume: number;
};

class Player extends Component<PlayerProps, PlayerState> {
  constructor(props: PlayerProps) {
    super(props);

    this.state = {
      showRemainingDuration: false,
      volume: (typeof localStorage !== 'undefined' && localStorage.volume) || 1,
    };
  }
  // TODO: Update type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  player: any;

  render() {
    const { playback, artists } = this.props;
    const { showRemainingDuration } = this.state;

    const { year, month, day } = splitShowDate(playback.showDate);
    const { artistSlug, source } = playback;
    const bandTitle = artists.data[artistSlug] ? artists.data[artistSlug].name : '';
    const activeTrack = playback.tracks.find(
      (track, idx: number) => idx === playback.activeTrack.idx
    );
    const nextTrack = playback.tracks.find(
      (track, idx: number) => idx === playback.activeTrack.idx + 1
    );
    const notchPosition =
      typeof window === 'undefined' || !this.player
        ? 0
        : (playback.activeTrack.currentTime / playback.activeTrack.duration) *
          (this.player.clientWidth - 3);

    return (
      <Flex className="relative h-[50px]">
        {activeTrack && (
          <Head>
            <title>
              {`${playback.activeTrack.isPaused ? '❚❚' : '▶'} ${
                activeTrack.title
              } ${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(
                2
              )} ${bandTitle}`}{' '}
              | Relisten
            </title>
          </Head>
        )}
        {activeTrack && (
          <Flex
            className="w-[50px] cursor-pointer items-center justify-center text-[#7a7a7a] active:text-[#4a4a4a]"
            onClick={() => player.togglePlayPause()}
          >
            <i
              className={`fa cursor-pointer fa-${playback.activeTrack.isPaused ? 'play' : 'pause'}`}
            />
          </Flex>
        )}
        {typeof window === 'undefined' || !activeTrack ? null : (
          <div className="relative h-full flex-1" ref={(ref) => (this.player = ref)}>
            <Flex className="h-full justify-center transition-all duration-[1s] ease-in-out">
              <div className="absolute left-[8px] top-1/2 translate-x-0 translate-y-[-50%] text-left text-[0.8em] text-[#7a7a7a]">
                <div>
                  <i
                    className="fa fa-backward cursor-pointer"
                    onClick={() => player.playPrevious()}
                  />
                </div>
                <div>{durationToHHMMSS(playback.activeTrack.currentTime)}</div>
              </div>
              <Flex column className="justify-around py-2">
                <div className="relative text-[1em] text-[#3c3c3c]">
                  {activeTrack.title}
                  {false && (
                    <Flex className="absolute left-full top-[2px] ml-2 w-full items-center text-[0.8em] text-[#7a7a7a]">
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
                  <a className="justify-center text-[0.8em] text-[#7a7a7a]">
                    {bandTitle} – {removeLeadingZero(month)}/{removeLeadingZero(day)}/
                    {year.slice(2)}
                  </a>
                </Link>
              </Flex>
              <div className="absolute left-[8px] right-[8px] top-1/2 translate-x-0 translate-y-[-50%] text-right text-[0.8em] text-[#7a7a7a]">
                <div>
                  <i className="fa fa-forward cursor-pointer" onClick={() => player.playNext()} />
                </div>
                <div onClick={this.toggleRemainingDuration}>
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
              onClick={this.onProgressClick}
              style={{ opacity: playback.activeTrack.currentTime < 0.1 ? 0.8 : null }}
            >
              <div
                className="absolute bottom-0 left-0 h-1 bg-[#707070]"
                style={{ width: notchPosition ? notchPosition + 2 : null }}
              />
              <div
                className="absolute bottom-0 left-0 z-[1] h-2 w-[3px] bg-black"
                style={{ transform: `translate(${notchPosition}px, 0)` }}
              />
            </div>
            <div
              className="absolute right-[-6px] top-0 h-full w-[6px] bg-[#0000001a]"
              onClick={this.setVolume}
            >
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 bg-[#707070]"
                style={{
                  top: `${(1 - this.state.volume) * 100}%`,
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
            <div className="w-[50px] cursor-pointer items-center justify-center self-center text-[#7a7a7a] active:text-[#4a4a4a]">
              <i className="fa fa fa-list-ol cursor-pointer" />
            </div>
          </Link>
        )}
      </Flex>
    );
  }

  onProgressClick = (e: React.MouseEvent) => {
    const { playback } = this.props;

    const { left, width } = this.player.getBoundingClientRect();

    const percentage = (e.pageX - left) / width;

    player.currentTrack.seek(percentage * (playback?.activeTrack?.duration ?? 0));
  };

  toggleRemainingDuration = (): void => {
    this.setState({ showRemainingDuration: !this.state.showRemainingDuration });
  };

  setVolume = (e: React.MouseEvent<HTMLElement>) => {
    const height = e.currentTarget.offsetHeight;
    const nextVolume = (height - e.pageY) / height;

    this.setState({ volume: nextVolume });

    player.setVolume(nextVolume);

    localStorage.volume = nextVolume;
  };
}

const mapStateToProps = ({ playback, tapes, artists }): PlayerProps => ({
  playback,
  tapes,
  artists,
});

export default connect(mapStateToProps)(Player);
