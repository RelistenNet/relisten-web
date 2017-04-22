import { connect } from 'react-redux'
import ReactAudioPlayer from 'react-audio-player'

import { createShowDate } from '../lib/utils';

const Player = ({ playback, currentTrack }) => (
  <div className="player">
    <style jsx>{`
      .player {
        max-width: 100vw;
        overflow: hidden;
      }
    `}</style>
    <pre>{JSON.stringify(playback)}</pre>
    <pre>{JSON.stringify(currentTrack)}</pre>
    {currentTrack && <ReactAudioPlayer
      src={currentTrack.mp3_url}
      autoPlay
    />}
  </div>
)

const mapStateToProps = ({ playback, tapes }) => {
  const showTapes = tapes[playback.artistSlug] && tapes[playback.artistSlug][playback.showDate] ? tapes[playback.artistSlug][playback.showDate] : null

  if (!showTapes) return { playback }

  const source = showTapes.data.sources.filter(source => String(source.id) === playback.source)[0]

  if (!source) return { playback }

  let currentTrack;

  source.sets.forEach(set =>
    currentTrack = set.tracks.filter(track => track.slug === playback.songSlug)[0] || currentTrack
  )

  if (!currentTrack) return { playback }

  return {
    playback,
    currentTrack
  }
}

export default connect(mapStateToProps)(Player)
