import { Queue, type TrackInfo } from 'gapless';

import { splitShowDate } from './utils';

import { scrobblePlay } from './scrobble';
import { updatePlayback } from '../redux/modules/playback';
import { API_DOMAIN } from './constants';
import { sortSources, sortTracksInSources } from './sortSources';
import { proxyStreamUrl } from './proxyStreamUrl';
import type { GaplessMetadata } from '../types';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../redux';
import { replaceUrl } from '@timber-js/app/client';

function detectMobileDevice(): boolean {
  if (window.matchMedia?.('(pointer: coarse)')?.matches) return true;
  if (navigator.maxTouchPoints > 0 && window.matchMedia?.('(hover: none)')?.matches) return true;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  return false;
}

declare global {
  interface Window {
    player: any;
    FLAC: string;
  }
}

function throttle<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  let lastArgs: Parameters<T> | null = null;
  const later = function () {
    previous = Date.now();
    timeout = null;
    if (lastArgs) func(...lastArgs);
    lastArgs = null;
  };
  return function (...args: Parameters<T>) {
    lastArgs = args;
    const now = Date.now();
    const remaining = wait - (now - previous);
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
      lastArgs = null;
    } else if (!timeout) {
      timeout = setTimeout(later, remaining);
    }
  } as T;
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
  if (isFinite(duration) && duration > 0) {
    localStorage.duration = duration;
  }
};

const throttledUpdateLocalStorage = throttle(updateLocalStorage, 1000);

let store: { dispatch: AppDispatch; getState: () => RootState } | undefined;
let lastScrobbledTrackUuid: string | null = null;
let restoreController: AbortController | null = null;


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
        throttledUpdateLocalStorage({
          isPaused: info.isPaused,
          currentTime: String(info.currentTime),
          duration: info.duration,
        });
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
      const activeTrackUpdate: Record<string, unknown> = info
        ? {
            id: info.metadata?.trackId as number | undefined,
            index: info.index,
            currentTime: info.currentTime,
            isPaused: info.isPaused,
            playbackType: info.playbackType,
            webAudioLoadingState: info.webAudioLoadingState,
          }
        : {};
      if (info && isFinite(info.duration) && info.duration > 0) {
        activeTrackUpdate.duration = info.duration;
      }
      store.dispatch(
        updatePlayback({
          activeTrack: activeTrackUpdate,
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

          const basePath = `/${artistSlug}/${year}/${month}/${day}/${songSlug}`;
          const prefixes = ['/embed-track', '/embed'];
          const routePrefix = prefixes.find((p) => window.location.pathname.startsWith(p)) ?? '';
          const nextUrl = `${routePrefix}${basePath}?source=${source}`;

          if (playback !== songSlug) {
            store.dispatch(updatePlayback({ songSlug, artistSlug, year, month, day, source }));
          }

          if (songSlug && !routePrefix) {
            window.localStorage.lastPlayedUrl = `${basePath}?source=${source}`;
            window.localStorage.lastPlayedTrackTitle = track.title ?? '';
            window.localStorage.lastPlayedArtistName = playback.artistName ?? '';
            window.localStorage.lastPlayedShowDate = playback.showDate ?? '';
            if (track.duration && isFinite(track.duration)) {
              window.localStorage.duration = track.duration;
            }
          }

          // update URL and page title to reflect current track without triggering a full navigation
          if (window.location.pathname.indexOf(`/${artistSlug}/${year}/${month}/${day}`) !== -1) {
            replaceUrl(nextUrl);
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
            toast.dismiss('autoplay-blocked');
          },
        },
      });
    },
  });
}

export function initGaplessPlayer(nextStore: { dispatch: AppDispatch; getState: () => RootState }) {
  if (typeof window === 'undefined') return;
  if (player) return;

  store = nextStore;

  currentPlaybackMethod = detectMobileDevice() ? 'HTML5_ONLY' : 'HYBRID';
  player = createQueue({ playbackMethod: currentPlaybackMethod });
  window.player = player;

  if (localStorage.volume) {
    player.setVolume(localStorage.volume);
  }

  if (window.location.pathname.startsWith('/embed')) return;

  const restored = restorePlaybackFromStorage();
  if (!restored) return;

  restoreController = new AbortController();
  fetch(`${API_DOMAIN}/api/v2/artists/${restored.artistSlug}/years/${restored.year}/${restored.showDate}`, {
    signal: restoreController.signal,
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((show) => {
      if (!show?.sources?.length) return clearRestoredPlaceholder();
      const sorted = sortSources(show.sources);
      sortTracksInSources(sorted);
      const activeSourceId = Number(restored.source) || sorted[0].id;
      const activeSource = sorted.find((s: any) => s.id === activeSourceId);
      if (!activeSource) return clearRestoredPlaceholder();
      const allTracks = activeSource.sets?.flatMap((set: any) => set.tracks).filter(Boolean) ?? [];
      restoreController = null;
      loadTracks(allTracks, restored.songSlug, {
        playImmediately: false,
        seekTime: restored.currentTime,
      });
    })
    .catch((e) => {
      if (e?.name !== 'AbortError') clearRestoredPlaceholder();
    });
}

function clearRestoredPlaceholder() {
  restoreController = null;
  if (!store) return;
  store.dispatch(updatePlayback({
    artistSlug: undefined, artistName: undefined,
    year: undefined, month: undefined, day: undefined, showDate: undefined,
    songSlug: undefined, source: undefined,
    paused: false, activeTrack: {}, tracks: [], gaplessTracksMetadata: [],
  }));
  delete localStorage.lastPlayedUrl;
}

function restorePlaybackFromStorage(): {
  artistSlug: string; year: string; month: string; day: string;
  showDate: string; songSlug: string; source: string | undefined;
  currentTime: number;
} | null {
  if (!store) return null;
  try {
    const lastUrl = localStorage.lastPlayedUrl;
    if (!lastUrl) return null;

    if (localStorage.duration === 'NaN') delete localStorage.duration;
    if (localStorage.currentTime === 'NaN') delete localStorage.currentTime;

    const parts = lastUrl.split('?')[0].split('/').filter(Boolean);
    if (parts.length < 5) return null;

    const [artistSlug, year, month, day, songSlug] = parts;
    const source = new URLSearchParams(lastUrl.split('?')[1]).get('source') ?? undefined;
    const currentTime = parseFloat(localStorage.currentTime) || 0;
    const duration = parseFloat(localStorage.duration) || 0;

    store.dispatch(updatePlayback({
      artistSlug,
      artistName: localStorage.lastPlayedArtistName || artistSlug.replace(/-/g, ' '),
      year, month, day,
      showDate: `${year}-${month}-${day}`,
      songSlug, source,
      paused: true,
      activeTrack: {
        index: 0,
        isPaused: true,
        currentTime,
        duration,
      },
      tracks: [{
        title: localStorage.lastPlayedTrackTitle || songSlug.replace(/-/g, ' '),
        slug: songSlug,
      }] as any,
    }));

    return { artistSlug, year, month, day, showDate: `${year}-${month}-${day}`, songSlug, source, currentTime };
  } catch {
    return null;
  }
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

export function loadTracks(
  tracks: any[],
  songSlug: string | undefined,
  { playImmediately = true, seekTime = 0 }: { playImmediately?: boolean; seekTime?: number } = {}
) {
  if (!store || !player) return;

  if (restoreController) {
    restoreController.abort();
    restoreController = null;
  }

  const activeTrackIndex = tracks.findIndex((t) => t.slug === songSlug);
  const idx = activeTrackIndex >= 0 ? activeTrackIndex : 0;

  resetPlayer();

  for (const track of tracks) {
    const url = proxyStreamUrl(window.FLAC ? track.flac_url || track.mp3_url : track.mp3_url);
    if (!url) continue;
    player.addTrack(url, {
      skipHEAD: /phish\.in/.test(String(url)),
      metadata: { trackId: track.id },
    });
  }

  store.dispatch(updatePlayback({
    tracks,
    activeTrack: {
      id: tracks[idx]?.id,
      index: idx,
      isPaused: !playImmediately,
      currentTime: seekTime,
      duration: tracks[idx]?.duration,
    },
  }));

  player.gotoTrack(idx, playImmediately, seekTime > 0 ? seekTime : undefined);
}

export default playerProxy;
