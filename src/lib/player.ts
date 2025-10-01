import Gapless from '../../public/gapless.cjs';

import { splitShowDate } from './utils';

import { scrobblePlay } from '../redux/modules/live';
import { updatePlayback } from '../redux/modules/playback';
import { ActiveTrack, GaplessMetadata } from '../types';
import { toast } from 'sonner';

declare global {
  interface Window {
    player: HTMLAudioElement;
    UPDATED_TRACK_VIA_GAPLESS: boolean;
    FLAC: string;
  }
}

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
function throttle(
  func: ({
    isPaused,
    currentTime,
    duration,
  }: {
    isPaused: boolean;
    currentTime: string;
    duration: number;
  }) => void,
  wait: number,
  options = { leading: true, trailing: true },
  ...args: IArguments[]
) {
  let context, result;
  let timeout: any = null;
  let previous = 0;
  const later = function () {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = (args as any) = null;
  };
  return function () {
    const now = Date.now();
    if (!previous && options.leading === false) previous = now;
    const remaining = wait - (now - previous);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    context = this;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = (args as any) = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}

const updateLocalStorage = ({
  isPaused,
  currentTime,
  duration,
}: {
  isPaused: boolean;
  currentTime: string;
  duration: number;
}) => {
  localStorage.isPaused = isPaused;
  localStorage.currentTime = currentTime;
  localStorage.duration = duration;
};

const throttledUpdateLocalStorage = () => {
  throttle(updateLocalStorage, 1000);
};

// Media Session API helpers
const updateMediaSessionMetadata = (track: any, artistName: string, showDate: string) => {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || 'Unknown Track',
    artist: artistName || 'Unknown Artist',
    album: showDate || '',
    artwork: track.artwork || [],
  });
};

const updateMediaSessionPositionState = (currentTime: number, duration: number) => {
  if (!('mediaSession' in navigator)) return;
  if (!duration || duration <= 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: 1.0,
      position: Math.min(currentTime, duration),
    });
  } catch (error) {
    // Some browsers may not support position state
    console.debug('Media Session position state not supported:', error);
  }
};

const initMediaSession = () => {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.setActionHandler('play', () => {
    player.play();
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    player.pause();
  });

  navigator.mediaSession.setActionHandler('previoustrack', () => {
    player.playPrevious();
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    player.playNext();
  });

  // Optional: seek backward/forward (10 seconds)
  try {
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (player.currentTrack) {
        const newTime = Math.max(0, player.currentTrack.currentTime - 10);
        player.currentTrack.seek(newTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (player.currentTrack) {
        const newTime = Math.min(
          player.currentTrack.duration,
          player.currentTrack.currentTime + 10
        );
        player.currentTrack.seek(newTime);
      }
    });
  } catch (error) {
    // Seek actions may not be supported in all browsers
    console.debug('Media Session seek actions not supported:', error);
  }
};

// TODO: Update type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any;
let mounted: boolean;
const player = new Gapless.Queue({
  onProgress: () => {
    if (!store) return;
    if (player.currentTrack) {
      throttledUpdateLocalStorage();

      // Update Media Session position state
      const { currentTime, duration } = player.currentTrack;
      if (currentTime >= 0 && duration > 0) {
        updateMediaSessionPositionState(currentTime, duration);
      }
    }
    store.dispatch(
      updatePlayback({
        activeTrack: player.currentTrack ? player.currentTrack.completeState : {},
        gaplessTracksMetadata: player.tracks
          ? player.tracks.map((metadata: GaplessMetadata) => ({
              idx: metadata.idx,
              trackMetadata: metadata.metadata, // <-- lol, I suck.
              playbackType: metadata.playbackType,
              webAudioLoadingState: metadata.webAudioLoadingState,
              loadedHead: metadata.loadedHead,
            }))
          : [],
      })
    );
  },
  onStartNewTrack: (currentTrack?: ActiveTrack) => {
    if (!store || !currentTrack) return;

    const idx = currentTrack.idx;

    const { playback, artists } = store.getState();

    if (playback.tracks && playback.tracks.length) {
      const track = playback.tracks[String(idx)];

      if (track) {
        const songSlug = track.slug;
        const { artistSlug, showDate, source } = playback;
        const { year, month, day } = splitShowDate(showDate);

        // Update Media Session metadata
        const artistName = artists.data[artistSlug]?.name || artistSlug;
        updateMediaSessionMetadata(track, artistName, showDate);

        if (typeof window.Notification !== 'undefined') {
          // only show notification if permission granted
          if (
            window.Notification.permission === 'granted' &&
            typeof Notification === 'function' &&
            (document.hasFocus ? !document.hasFocus() : true)
          ) {
            // const bandName = `${artists.data[artistSlug] ? artists.data[artistSlug].name : ''}`;
            // const notification = new Notification(track.title, {
            //   body: `${bandName} \n${showDate}`,
            //   silent: true, // only for Firefox
            // });
            // setTimeout(() => notification.close(), 3000);
          }
        }

        store.dispatch(scrobblePlay({ uuid: track.uuid }));

        const nextUrl = `/${artistSlug}/${year}/${month}/${day}/${songSlug}?source=${source}`;

        if (playback !== songSlug) {
          store.dispatch(updatePlayback({ songSlug, artistSlug, year, month, day, source }));
        }

        if (songSlug) {
          window.localStorage.lastPlayedUrl = nextUrl;
        }

        // shitty hack to prevent view updating content because of URL
        if (window.location.pathname.indexOf(`/${artistSlug}/${year}/${month}/${day}`) !== -1) {
          player.changeURL(nextUrl);
        }
      }
    }
  },
  onError: () => {
    toast.error('There was an error loading your audio', {
      toasterId: 'audio-error',
      duration: Infinity,
    });
  },
});

export function initGaplessPlayer(nextStore, changeURL) {
  if (typeof window === 'undefined') return;
  store = nextStore;

  const { isMobile } = store.getState().app;

  // if we're on mobile, disable web audio
  // TODO: triage mobile gapless
  if (isMobile) {
    player.disableWebAudio();
  }

  // just for debugging purposes
  window.player = player;

  if (localStorage.volume) {
    player.setVolume(localStorage.volume);
  }

  player.changeURL = changeURL;

  // Initialize Media Session API for hardware media key support
  initMediaSession();

  mounted = true;
}

export function isPlayerMounted() {
  return mounted;
}

export default player;
