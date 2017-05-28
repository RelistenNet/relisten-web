import { Component } from 'react'
import { connect } from 'react-redux'
import Head from 'next/head'
import Link from 'next/link'

import bands from '../lib/bands'
import { createShowDate, durationToHHMMSS, removeLeadingZero, splitShowDate } from '../lib/utils'
import player from '../lib/player'

import Queue from './Queue'

class Player extends Component {
  render() {
    const { playback, tapes } = this.props;

    const { year, month, day } = splitShowDate(playback.showDate)
    const { artistSlug, source } = playback
    const bandTitle = bands[artistSlug] ? bands[artistSlug].name : ''
    const activeTrack = playback.tracks.find((track, idx) => idx === playback.activeTrack.idx);
    const notchPosition = typeof window === 'undefined' || !this.container ? 0 : (playback.activeTrack.currentTime / playback.activeTrack.duration) * this.container.clientWidth;

    return (
      <div ref={ref => this.container = ref} className="container">
        <style jsx>{`
          .container {
            height: 50px;
            position: relative;
          }

          .player {
            height: 100%;
          }

          .content {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            transition: all 1s ease-in-out;
            height: 100%;
          }

          .progress-container {
            width: 100%;
            height: 4px;
            background: #BCBCBC;
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
            transition: width 64ms linear;
          }

          .progress-notch {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 3px;
            height: 8px;
            background: #000;
            transition: transform 64ms linear;
            z-index: 1;
          }

          .info {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            padding: 8px 0;
          }

          .song-title {
            color: #3C3C3C;
            font-size: 1em;
          }

          .band-title {
            color: #7A7A7A;
            font-size: 0.8em;
          }

          .timing {
            color: #7A7A7A;
            margin: 0 8px;
            margin-top: auto;
            margin-bottom: 8px;
            font-size: 0.8em;
          }

        `}</style>
        {activeTrack && <Head>
          <title>{`${playback.activeTrack.isPaused ? '❚ ❚' : '▶'} ${activeTrack.title} ${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(2)} ${bandTitle}`} | Relisten</title>
        </Head>}
        {typeof window === 'undefined' || !activeTrack ? null :
          <div className="player">
            <div className="content">
              <div className="timing">
                <div><i className="fa fa-step-backward" onClick={() => player.playPrevious()} /></div>
                <div>{durationToHHMMSS(playback.activeTrack.currentTime)}</div>
              </div>
              <div className="info">
                <div className="song-title">{activeTrack.title}</div>

                <Link href="/" as={`/${artistSlug}/${year}/${month}/${day}?source=${source}`}><a className="band-title">{bandTitle} – {removeLeadingZero(month)}/{removeLeadingZero(day)}/{year.slice(2)}</a></Link>
              </div>
              <div className="timing">
                <div><i className="fa fa-step-forward" onClick={() => player.playNext()} /></div>
                <div>{durationToHHMMSS(playback.activeTrack.duration)}</div>
              </div>
            </div>
            <div className="progress-container" onClick={this.onProgressClick} style={{ opacity: playback.activeTrack.currentTime < 0.1 ? 0.8 : null }}>
              <div className="progress-background" style={{ width: notchPosition ? notchPosition + 2 : null }} />
              <div className="progress-notch" style={{ transform: `translate(${notchPosition}px, 0)` }} />
            </div>
          </div>
        }
      </div>
    );
  }

  onProgressClick = (e) => {
    const { playback } = this.props;

    const percentage = (e.pageX - this.container.offsetLeft) / this.container.clientWidth;
    console.log(this.container.offsetLeft, this.container.clientWidth)

    player.currentTrack.seek(percentage * playback.activeTrack.duration)
  }
}

const mapStateToProps = ({ playback, tapes }) => ({ playback, tapes })

export default connect(mapStateToProps)(Player)
