import { Queue, type TrackInfo } from 'gapless';

import { splitShowDate } from './utils';

import { scrobblePlay } from './scrobble';
import { updatePlayback } from '../redux/modules/playback';
import type { GaplessMetadata } from '../types';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../redux';

declare global {
  interface Window {
    player: any;
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
  let timeout: ReturnType<typeof setTimeout> | null = null;
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

let store: { dispatch: AppDispatch; getState: () => RootState } | undefined;
let mounted: boolean;
let pendingSeekTime: number | null = null;
let lastScrobbledTrackUuid: string | null = null;

export function setPendingSeekTime(seconds: number) {
  pendingSeekTime = seconds;
}

let player: Queue | undefined;
let currentPlaybackMethod: 'HYBRID' | 'HTML5_ONLY' = 'HYBRID'; // reassigned in initGaplessPlayer

// Proxy that always delegates to the current `player` instance.
// This is needed because `export default` captures the value at declaration time,
// but `player` gets reassigned in initGaplessPlayer/resetPlayer.
const playerProxy = new Proxy({} as Queue, {
  get(_target, prop) {
    if (!player) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (player as any)[prop];
    return typeof val === 'function' ? val.bind(player) : val;
  },
});

function createQueue(options?: { playbackMethod?: 'HYBRID' | 'HTML5_ONLY' }): Queue {
  return new Queue({
    playbackMethod: options?.playbackMethod ?? 'HYBRID',
    onDebug: (msg: string) => console.log('[gapless]', msg),
    onProgress: (info: TrackInfo) => {
      if (!store) return;
      if (info) {
        throttledUpdateLocalStorage();
        if (!info.isPaused) {
          toast.dismiss('autoplay-blocked');
        }
        // Scrobble after 5 seconds of playback
        if (info.currentTime >= 5) {
          const { playback } = store.getState();
          const track = playback.tracks?.[info.index];
          if (track?.uuid && lastScrobbledTrackUuid !== track.uuid) {
            lastScrobbledTrackUuid = track.uuid;
            scrobblePlay(track.uuid);
          }
        }
      }
      store.dispatch(
        updatePlayback({
          activeTrack: info
            ? {
                id: info.metadata?.trackId as number | undefined,
                index: info.index,
                currentTime: info.currentTime,
                duration: info.duration,
                isPaused: info.isPaused,
                playbackType: info.playbackType,
                webAudioLoadingState: info.webAudioLoadingState,
              }
            : {},
          gaplessTracksMetadata: player?.tracks
            ? player.tracks.map((trackInfo: TrackInfo) => ({
                index: trackInfo.index,
                trackMetadata: trackInfo.metadata as GaplessMetadata['trackMetadata'],
                playbackType: trackInfo.playbackType,
                webAudioLoadingState: trackInfo.webAudioLoadingState,
              }))
            : [],
        })
      );
    },
    onStartNewTrack: (info: TrackInfo) => {
      if (!store || !info) return;

      const idx = info.index;

      const { playback } = store.getState();

      if (playback.tracks && playback.tracks.length) {
        const track = playback.tracks[String(idx)];

        if (track) {
          const songSlug = track.slug;
          const { artistSlug, showDate, source } = playback;
          const { year, month, day } = splitShowDate(showDate);

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

          const nextUrl = `/${artistSlug}/${year}/${month}/${day}/${songSlug}?source=${source}`;

          if (playback !== songSlug) {
            store.dispatch(updatePlayback({ songSlug, artistSlug, year, month, day, source }));
          }

          if (songSlug) {
            window.localStorage.lastPlayedUrl = nextUrl;
          }

          // update URL and page title to reflect current track without triggering a full navigation
          if (window.location.pathname.indexOf(`/${artistSlug}/${year}/${month}/${day}`) !== -1) {
            window.history.replaceState(window.history.state, '', nextUrl);
            // Keep everything after the first " | " (e.g. "2024-01-01 | Grateful Dead | Relisten")
            // and replace only the track name portion
            const titleParts = document.title.split(' | ');
            titleParts[0] = track.title;
            document.title = titleParts.join(' | ');
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
    onPlayBlocked: () => {
      toast.warning('Autoplay blocked', {
        toasterId: 'audio-error',
        id: 'autoplay-blocked',
        duration: Infinity,
        description: (
          <ol className="m-0 flex flex-col gap-1 pl-0">
            <li>
              To start playing, hit <strong>Play now</strong>
            </li>
            <li>
              To prevent this in the future, click the <strong>lock icon</strong> in your address
              bar, select <strong>Sound</strong>, and choose <strong>Always Allow</strong>
            </li>
          </ol>
        ),
        classNames: {
          toast: '!bg-amber-100 !text-amber-800 !border-amber-500',
          title: '!text-base !font-semibold !inline !align-middle',
          icon: '!inline !align-middle !mr-1',
          actionButton: '!bg-amber-700 !text-white',
          closeButton: '!border-amber-400',
        },
        action: {
          label: 'Play now',
          onClick: () => {
            if (!player) return;
            player.resumeAudioContext();
            player.play();
            if (pendingSeekTime && pendingSeekTime > 0 && player.currentTrack) {
              setTimeout(() => {
                player!.seek(pendingSeekTime!);
                pendingSeekTime = null;
              }, 100);
            }
            toast.dismiss('autoplay-blocked');
          },
        },
      });
    },
  });
}

export function initGaplessPlayer(
  nextStore: { dispatch: AppDispatch; getState: () => RootState },
  { isMobile }: { isMobile?: boolean } = {}
) {
  if (typeof window === 'undefined') return;
  store = nextStore;

  currentPlaybackMethod = isMobile ? 'HTML5_ONLY' : 'HYBRID';
  player = createQueue({ playbackMethod: currentPlaybackMethod });

  // just for debugging purposes
  window.player = player;

  if (localStorage.volume) {
    player.setVolume(localStorage.volume);
  }

  mounted = true;
}

export function resetPlayer() {
  if (player) {
    player.destroy();
  }
  player = createQueue({ playbackMethod: currentPlaybackMethod });
  window.player = player;
  if (localStorage.volume) {
    player.setVolume(localStorage.volume);
  }
}

export function isPlayerMounted() {
  return mounted;
}

export default playerProxy;
