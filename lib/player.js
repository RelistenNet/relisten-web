import Router from 'next/router'
import Gapless from '../static/gapless'

import { splitShowDate } from './utils'

import { updatePlayback } from '../redux/modules/playback'

let store
let mounted
const player = new Gapless.Queue({
  onProgress: () => {
    store && store.dispatch(updatePlayback({ activeTrack: player.currentTrack ? player.currentTrack.completeState : {} }))
  },
  onStartNewTrack: (currentTrack) => {
    if (!store) return;

    const idx = currentTrack.idx

    const { playback } = store.getState()

    if (playback.tracks && playback.tracks.length) {
      const track = playback.tracks[idx]

      if (track) {
        const songSlug = track.slug
        const { artistSlug, showDate, source } = playback
        const { year, month, day } = splitShowDate(showDate)

        if (playback !== songSlug) store.dispatch(updatePlayback({ songSlug }))
        // shitty hack to prevent
        window.UPDATED_TRACK_VIA_GAPLESS = true
        console.log(`/${artistSlug}/${year}/${month}/${day}/${songSlug}?source=${source}`)
        Router.replace('/', `/${artistSlug}/${year}/${month}/${day}/${songSlug}?source=${source}`)
      }
    }
  }
})

export function initGaplessPlayer(nextStore) {
  if (typeof window === 'undefined') return;
  store = nextStore

  const { isMobile } = store.getState().app;

  // if we're on mobile, disable web audio
  if (isMobile) player.disableWebAudio();

  // just for debugging purposes
  window.player = player

  mounted = true
}

export function isPlayerMounted() {
  return mounted
}

export default player