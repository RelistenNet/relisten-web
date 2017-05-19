import { Component } from 'react'
import { connect } from 'react-redux'

import { createShowDate, durationToHHMMSS } from '../lib/utils'
import player from '../lib/player'

class Player extends Component {
  render() {
    const { playback } = this.props;

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

        .queue {
          width: 200px;
          max-height: 188px;
          display: flex;
          flex-direction: column;
          overflow-y: scroll;
          cursor: pointer;
        }

        .queue .active {
          background: #333;
          color: #FFF;
        }

        .controls {
          display: flex;
          justify-content: space-between;
          width: 5%;
          font-size: 2em;
        }

      `}</style>
      {typeof window === 'undefined' || !playback.tracks.length ? null :
        <div>
          <div className="progress-container" onClick={this.onProgressClick}>
            <div className="progress-notch" style={{ transform: `translate(${notchPosition}px, 0)` }} />
          </div>
          <div className="content">
            <div className="queue">
              {playback.tracks.map((track, idx) =>
                <div key={idx} onClick={() => player.gotoTrack(idx, true) } className={idx === playback.activeTrack.idx ? 'active' : ''}>{track.title}</div>
              )}
            </div>
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

const mapStateToProps = ({ playback }) => ({ playback })

export default connect(mapStateToProps)(Player)
