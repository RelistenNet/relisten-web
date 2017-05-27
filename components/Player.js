import { Component } from 'react'
import { connect } from 'react-redux'
import { Helmet } from 'react-helmet'

import bands from '../lib/bands'
import { createShowDate, durationToHHMMSS, removeLeadingZero, splitShowDate } from '../lib/utils'
import player from '../lib/player'

import Queue from './Queue'

class Player extends Component {
  render() {
    const { playback, tapes } = this.props;

    const { year, month, day } = splitShowDate(playback.showDate)
    const bandTitle = bands[playback.artistSlug] ? bands[playback.artistSlug].name : ''
    const activeTrack = playback.tracks.find((track, idx) => idx === playback.activeTrack.idx);
    const notchPosition = typeof window === 'undefined' ? 0 : (playback.activeTrack.currentTime / playback.activeTrack.duration) * window.innerWidth - 2;

    return (
      <div className="player">
        <style jsx>{`
          .player {
            height: 200px;
          }

          .content {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            transition: all 1s ease-in-out;
          }

          .progress-container {
            width: 100%;
            height: 12px;
            background: #777;
            position: relative;
          }

          .progress-notch {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 4px;
            background: #FFF;
            transition: transform 64ms linear;
          }

          .controls {
            display: flex;
            justify-content: space-between;
            width: 5%;
            font-size: 2em;
          }

        `}</style>
        {activeTrack && <Helmet>
          <title>{`${activeTrack.title} ${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(2)} ${bandTitle}`}</title>
        </Helmet>}
        {typeof window === 'undefined' || !playback.tracks.length ? null :
          <div>
            <div className="progress-container" onClick={this.onProgressClick}>
              <div className="progress-notch" style={{ transform: `translate(${notchPosition}px, 0)` }} />
            </div>
            <div className="content">
              <Queue playback={playback} tapes={tapes} />
              <div className="controls">
                <i className="fa fa-step-backward" onClick={() => player.playNext()} />
                <i className={`fa fa-${playback.activeTrack.isPaused ? 'play' : 'pause'}`} onClick={() => player.togglePlayPause()} />
                <i className="fa fa-step-forward" onClick={() => player.playNext()} />
              </div>
              <div>
                {durationToHHMMSS(playback.activeTrack.currentTime)} / {durationToHHMMSS(playback.activeTrack.duration)}
              </div>
              <div style={{ width: 300 }}>
                <pre>{JSON.stringify(playback.activeTrack, null, 2)}</pre>
              </div>
            </div>
          </div>
        }
      </div>
    );
  }

  onProgressClick = (e) => {
    const { playback } = this.props;

    const percentage = e.pageX / window.innerWidth;

    player.currentTrack.seek(percentage * playback.activeTrack.duration)
  }
}

const mapStateToProps = ({ playback, tapes }) => ({ playback, tapes })

export default connect(mapStateToProps)(Player)
