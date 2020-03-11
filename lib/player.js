import Router from 'next/router';
import Gapless from '../static/gapless';

import { splitShowDate } from './utils';

import { scrobblePlay } from '../redux/modules/recent-streams';
import { updatePlayback } from '../redux/modules/playback';

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
function throttle(func, wait, options) {
  let context, args, result;
  let timeout = null;
  let previous = 0;
  if (!options) options = {};
  const later = function() {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function() {
    const now = Date.now();
    if (!previous && options.leading === false) previous = now;
    const remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}

const updateLocalStorage = ({ isPaused, currentTime, duration }) => {
  localStorage.isPaused = isPaused;
  localStorage.currentTime = currentTime;
  localStorage.duration = duration;
};

const throttledUpdateLocalStorage = throttle(updateLocalStorage, 1000);

let store;
let mounted;
const player = new Gapless.Queue({
  onProgress: () => {
    if (!store) return;
    if (player.currentTrack) {
      throttledUpdateLocalStorage(player.currentTrack);
    }
    store.dispatch(updatePlayback({
      activeTrack: player.currentTrack ? player.currentTrack.completeState : {},
      gaplessTracksMetadata: player.tracks ? player.tracks.map(metadata => ({
        idx: metadata.idx,
        trackMetadata: metadata.metadata, // <-- lol, I suck.
        playbackType: metadata.playbackType,
        webAudioLoadingState: metadata.webAudioLoadingState,
        loadedHead: metadata.loadedHead,
      })) : [],
    }));
  },
  onStartNewTrack: (currentTrack) => {
    if (!store) return;

    const idx = currentTrack.idx;

    const { playback, artists } = store.getState();

    if (playback.tracks && playback.tracks.length) {
      const track = playback.tracks[idx];

      if (track) {
        const songSlug = track.slug;
        const { artistSlug, showDate, source } = playback;
        const { year, month, day } = splitShowDate(showDate);

        if (typeof window.Notification !== 'undefined') {
          // only show notification if permission granted
          if (window.Notification.permission === 'granted' && (document.hasFocus ? !document.hasFocus() : true)) {
            const bandName = `${artists.data[artistSlug] ? artists.data[artistSlug].name : ''}`;
            const notification = new Notification(track.title, {
              body: `${bandName} \n${showDate}`,
              silent: true, // only for Firefox
            });

            setTimeout(() => notification.close(), 3000);
          }
        }

        store.dispatch(scrobblePlay({ uuid: track.uuid }));

        const nextUrl = `/${artistSlug}/${year}/${month}/${day}/${songSlug}?source=${source}`;

        if (playback !== songSlug) store.dispatch(updatePlayback({ songSlug }));

        if (songSlug) {
          window.localStorage.lastPlayedUrl = nextUrl;
        }

        // shitty hack to prevent view updating content because of URL
        if (window.location.pathname.indexOf(`/${artistSlug}/${year}/${month}/${day}`) !== -1) {
          window.UPDATED_TRACK_VIA_GAPLESS = true;
          Router.replace('/', nextUrl);
        }
      }
    }
  },
});

export function initGaplessPlayer(nextStore) {
  if (typeof window === 'undefined') return;
  store = nextStore;

  const { isMobile } = store.getState().app;

  const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;

  // if we're on mobile, disable web audio
  // if we're on firefox, disable web audio/gapless
  // gapless doesn't work on firefox & its been causing a ton of issues

  // disable for everyone until I can inspect the issue again...
  if (true || !Number(localStorage.forceGaplessOn) && (isMobile || isFirefox)) player.disableWebAudio();

  // just for debugging purposes
  window.player = player;

  if (localStorage.volume) {
    player.setVolume(localStorage.volume);
  }

  mounted = true;
}

export function isPlayerMounted() {
  return mounted;
}

export default player;
