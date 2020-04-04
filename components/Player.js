import React from "react";
import { Component } from "react";
import { connect } from "react-redux";
import Head from "next/head";
import Link from "next/link";
import { TwitterShareButton, TwitterIcon } from "react-share";
import {
  createShowDate,
  durationToHHMMSS,
  removeLeadingZero,
  splitShowDate,
} from "../lib/utils";
import player from "../lib/player";

class Player extends Component {
  constructor(props, ctx) {
    super(props, ctx);

    this.state = {
      showRemainingDuration: false,
      volume: (typeof localStorage !== "undefined" && localStorage.volume) || 1,
    };
  }

  getHashtags(artistSlug, year) {
    switch (artistSlug) {
      case "grateful-dead":
        return ["GratefulDead", `${year}GratefulDead`, "LiveGratefulDead", "RelistenApp"];
      case "phish":
        return ["Phish", `${year}Phish`, "LivePhish", "RelistenApp"];
      default:
        return ["Reslisten", "RelistenApp"];
    }
  }

  render() {
    const { playback, tapes, artists } = this.props;
    const { showRemainingDuration } = this.state;

    const { year, month, day } = splitShowDate(playback.showDate);
    const { artistSlug, source } = playback;
    const bandTitle = artists.data[artistSlug]
      ? artists.data[artistSlug].name
      : "";
    const activeTrack = playback.tracks.find(
      (track, idx) => idx === playback.activeTrack.idx
    );
    const nextTrack = playback.tracks.find(
      (track, idx) => idx === playback.activeTrack.idx + 1
    );
    const notchPosition =
      typeof window === "undefined" || !this.player
        ? 0
        : (playback.activeTrack.currentTime / playback.activeTrack.duration) *
          (this.player.clientWidth - 3);

    return (
      <div className="container">
        <style jsx>{`
          .container {
            height: 50px;
            display: flex;
            position: relative;
          }

          .container .fas {
            cursor: pointer;
          }

          .playpause,
          .queue-button {
            width: 50px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #7a7a7a;
            cursor: pointer;
          }

          .playpause:active,
          .queue-button:active {
            color: #4a4a4a;
          }

          .player {
            height: 100%;
            flex: 1;
            position: relative;
          }

          .content {
            display: flex;
            flex-direction: row;
            justify-content: center;
            transition: all 1s ease-in-out;
            height: 100%;
          }

          .progress-container {
            width: 100%;
            height: 4px;
            background: #bcbcbc;
            position: absolute;
            left: 0;
            bottom: 0;
            z-index: 1;
            cursor: pointer;
          }

          .progress-background {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            background: #707070;
            // transition: width 64ms linear;
          }

          .progress-notch {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 3px;
            height: 8px;
            background: #000;
            // transition: transform 64ms linear;
            z-index: 1;
          }

          .info {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            padding: 8px 0;
          }

          .song-title {
            color: #3c3c3c;
            font-size: 1em;
            position: relative;
          }

          .after-song-title {
            display: flex;
            align-items: center;
            position: absolute;
            width: 100%;
            left: 100%;
            top: 2px;
            margin-left: 8px;
            font-size: 0.8em;
            color: #7a7a7a;
          }

          .band-title {
            color: #7a7a7a;
            font-size: 0.8em;
            justify-content: center;
          }

          .timing {
            color: #7a7a7a;
            font-size: 0.8em;
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translate(0, -50%);
            text-align: left;
          }

          .twitter-share {
            display: flex;
          }

          .duration {
            left: initial;
            right: 8px;
            text-align: right;
          }

          .volume-container {
            height: 100%;
            width: 6px;
            background: rgba(0, 0, 0, 0.1);
            position: absolute;
            right: -6px;
            top: 0;
          }

          .volume-bar {
            background: #707070;
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            pointer-events: none;
          }
        `}</style>
        {activeTrack && (
          <Head>
            <title>
              {`${playback.activeTrack.isPaused ? "❚❚" : "▶"} ${
                activeTrack.title
              } ${removeLeadingZero(month)}/${removeLeadingZero(
                day
              )}/${year.slice(2)} ${bandTitle}`}{" "}
              | Relisten
            </title>
          </Head>
        )}
        {activeTrack && (
          <div className="playpause" onClick={() => player.togglePlayPause()}>
            <i
              className={`fas fa-${
                playback.activeTrack.isPaused ? "play" : "pause"
              }`}
            />
          </div>
        )}
        {typeof window === "undefined" || !activeTrack ? null : (
          <div className="player" ref={(ref) => (this.player = ref)}>
            <div className="content">
              <div className="timing">
                <div>
                  <i
                    className="fas fa-backward"
                    onClick={() => player.playPrevious()}
                  />
                </div>
                <div>{durationToHHMMSS(playback.activeTrack.currentTime)}</div>
              </div>
              <div className="info">
                <div className="song-title">
                  {activeTrack.title}
                  {false && (
                    <div className="after-song-title">
                      <div>Next: {nextTrack && nextTrack.title}&nbsp;</div>
                      <i className="fas fa-angle-down" />
                    </div>
                  )}
                </div>

                <Link
                  href="/"
                  as={`/${artistSlug}/${year}/${month}/${day}?source=${source}`}
                >
                  <a className="band-title">
                    {bandTitle} – {removeLeadingZero(month)}/
                    {removeLeadingZero(day)}/{year.slice(2)}
                  </a>
                </Link>
              </div>
              <div className="timing duration">
                <div>
                  <i
                    className="fas fa-forward"
                    onClick={() => player.playNext()}
                  />
                </div>
                <div onClick={this.toggleRemainingDuration}>
                  {durationToHHMMSS(
                    showRemainingDuration
                      ? playback.activeTrack.currentTime -
                          playback.activeTrack.duration
                      : playback.activeTrack.duration
                  )}
                </div>
              </div>
            </div>
            <div
              className="progress-container"
              onClick={this.onProgressClick}
              style={{
                opacity: playback.activeTrack.currentTime < 0.1 ? 0.8 : null,
              }}
            >
              <div
                className="progress-background"
                style={{ width: notchPosition ? notchPosition + 2 : null }}
              />
              <div
                className="progress-notch"
                style={{ transform: `translate(${notchPosition}px, 0)` }}
              />
            </div>
            <div className="volume-container" onClick={this.setVolume}>
              <div
                className="volume-bar"
                style={{
                  top: `${(1 - this.state.volume) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
        {activeTrack && (
          <>
            <Link
              href="/"
              as={`/${artistSlug}/${year}/${month}/${day}?source=${source}`}
            >
              <div className="queue-button">
                <i className="fas fa-list-ol" />
              </div>
            </Link>
            <TwitterShareButton
              title={`I'm listening to ${activeTrack.title} by ${bandTitle} from ${year}-${month}-${day} on Relisten.net - ${window.location.href}`}
              hashtags={this.getHashtags(artistSlug, year)}
              className="twitter-share"
            >
              <TwitterIcon size={32} round />
            </TwitterShareButton>
          </>
        )}
      </div>
    );
  }

  onProgressClick = (e) => {
    const { playback } = this.props;

    const { left, width } = this.player.getBoundingClientRect();

    const percentage = (e.pageX - left) / width;

    player.currentTrack.seek(percentage * playback.activeTrack.duration);
  };

  toggleRemainingDuration = () => {
    this.setState({ showRemainingDuration: !this.state.showRemainingDuration });
  };

  setVolume = (e) => {
    const height = e.currentTarget.offsetHeight;
    const nextVolume = (height - e.pageY) / height;

    this.setState({ volume: nextVolume });

    player.setVolume(nextVolume);

    localStorage.volume = nextVolume;
  };
}

const mapStateToProps = ({ playback, tapes, artists }) => ({
  playback,
  tapes,
  artists,
});

export default connect(mapStateToProps)(Player);
