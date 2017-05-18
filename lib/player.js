import Gapless from '../static/gapless'
import { updatePlayback } from '../redux/modules/playback'

let mounted
let player = new Gapless.Queue()

export function initGaplessPlayer(store) {
  if (typeof window === 'undefined') return;
  mounted = true
  console.log(player, new Error().stack)

  player.setProps({ onProgress: () => store.dispatch(updatePlayback({ activeTrack: player.currentTrack ? player.currentTrack.completeState : {} })) })
}

export function isPlayerMounted() {
  return mounted
}

export default player