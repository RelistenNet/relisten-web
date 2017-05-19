import mousetrap from 'mousetrap'
import player from './player'

if (mousetrap.bind) {
  mousetrap.bind('space', () => {
    player.togglePlayPause()

    return false
  })
  mousetrap.bind('right', () => {
    player.playNext()

    return false
  })
  mousetrap.bind('left', () => {
    player.playPrevious()

    return false
  })
}

export default mousetrap
