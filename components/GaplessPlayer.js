import { Component } from 'react'
import { connect } from 'react-redux'

import { createShowDate, durationToHHMMSS } from '../lib/utils';

class GaplessPlayer extends Component {
  render() {
    const { playback } = this.props;

    const percentage = typeof window === 'undefined' ? 0 : (playback.activeTrack.currentTime / playback.activeTrack.duration) * window.innerWidth;

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
                }

                .queue {
                    width: 200px;
                    max-height: 200px;
                    display: flex;
                    flex-direction: column;
                    overflow-y: scroll;
                    cursor: pointer;
                }

                .queue .active {
                    background: #333;
                    color: #FFF;
                }

                `}</style>
      {typeof window === 'undefined' || !playback.tracks.length ? null :
        <div>
          <div className="progress-container" onClick={this.onProgressClick}>
            <div className="progress-notch" style={{ transform: `translate(${percentage}px, 0)` }} />
          </div>
          <div className="content">
            <div style={{ width: 300 }}>
              <pre>{JSON.stringify(playback.activeTrack, null, 2)}</pre>
            </div>
            <div className="queue">
              {playback.tracks.map((track, idx) =>
                <div key={idx} onClick={() => window.relistenPlayer.gotoTrack(idx, true) } className={idx === playback.activeTrack.idx ? 'active' : ''}>{track.title}</div>
              )}
            </div>
            <div>
              {durationToHHMMSS(playback.activeTrack.currentTime)} / {durationToHHMMSS(playback.activeTrack.duration)}
            </div>
            <div className="previous" onClick={() => window.relistenPlayer.playPrevious()}>&lt;</div>
            <div className="playpause" onClick={() => window.relistenPlayer.togglePlayPause()}>
              {playback.activeTrack.isPaused ? 'play' : 'pause'}
            </div>
            <div className="next" onClick={() => window.relistenPlayer.playNext()}>&gt;</div>
          </div>
        </div>
      }
      </div>
    );
  }

  onProgressClick = (e) => {
    const { playback } = this.props;

    const percentage = e.pageX / window.innerWidth;

    window.relistenPlayer.currentTrack.seek(percentage * playback.activeTrack.duration)
  }
}

const mapStateToProps = ({ playback }) => ({ playback })

export default connect(mapStateToProps)(GaplessPlayer)
