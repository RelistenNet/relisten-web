import Router from 'next/router'
import Gapless from '../static/gapless'

import { splitShowDate } from './utils'

import { updatePlayback } from '../redux/modules/playback'

let store
let mounted
let player = new Gapless.Queue({
  id: 'main',
  onProgress: () => {
    store && store.dispatch(updatePlayback({ activeTrack: player.currentTrack ? player.currentTrack.completeState : {} }))
  },
  onPlayNextTrack: (currentTrack) => {
    // const idx = currentTrack.idx

    // const { playback } = store.getState()
    // console.log(playback)

    // if (playback.tracks && playback.tracks.length) {
    //   const track = playback.tracks[idx]

    //   if (track) {
    //     const { artistSlug, showDate, source } = playback;
    //     const { year, month, day } = splitShowDate(showDate)

    //     Router.replace('/', `/${artistSlug}/${year}/${month}/${day}/${track.slug}?source=${source}`)
    //   }
    // }
  }
})

export function initGaplessPlayer(nextStore) {
  if (typeof window === 'undefined') return;
  store = nextStore
  // debug
  window.player = player
  mounted = true
}

export function isPlayerMounted() {
  return mounted
}

export default player