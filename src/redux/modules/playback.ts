import type { GaplessMetadata, Track } from '../../types';

const UPDATE = 'playback/UPDATE' as const;
const UPDATE_TRACK = 'playback/UPDATE_TRACK' as const;

export interface ActiveTrack {
  id?: number;
  index?: number;
  isPaused?: boolean;
  currentTime?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface PlaybackState {
  artistSlug?: string;
  artistName?: string;
  showDate?: string;
  month?: string;
  day?: string;
  year?: string;
  songSlug?: string;
  source?: string;
  currentTrackId?: string;
  paused: boolean;
  activeTrack: ActiveTrack;
  tracks: Track[];
  gaplessTracksMetadata: GaplessMetadata[];
}

function getInitialState(): PlaybackState {
  const empty: PlaybackState = {
    artistSlug: undefined,
    artistName: undefined,
    month: undefined,
    day: undefined,
    year: undefined,
    songSlug: undefined,
    source: undefined,
    currentTrackId: undefined,
    paused: false,
    activeTrack: {},
    tracks: [],
    gaplessTracksMetadata: [],
  };

  if (typeof window === 'undefined') return empty;

  try {
    const lastUrl = localStorage.lastPlayedUrl;
    if (!lastUrl) return empty;

    if (localStorage.duration === 'NaN') delete localStorage.duration;
    if (localStorage.currentTime === 'NaN') delete localStorage.currentTime;

    const parts = lastUrl.split('?')[0].split('/').filter(Boolean);
    if (parts.length < 5) return empty;

    const [artistSlug, year, month, day, songSlug] = parts;
    const source = new URLSearchParams(lastUrl.split('?')[1]).get('source') ?? undefined;

    return {
      ...empty,
      artistSlug,
      artistName: localStorage.lastPlayedArtistName || artistSlug.replace(/-/g, ' '),
      year,
      month,
      day,
      showDate: `${year}-${month}-${day}`,
      songSlug,
      source,
      paused: true,
      activeTrack: {
        index: 0,
        isPaused: true,
        currentTime: parseFloat(localStorage.currentTime) || 0,
        duration: parseFloat(localStorage.duration) || 0,
      },
      tracks: [{
        title: localStorage.lastPlayedTrackTitle || songSlug.replace(/-/g, ' '),
        slug: songSlug,
      }] as any,
    };
  } catch {
    return empty;
  }
}

const defaultState: PlaybackState = getInitialState();

type PlaybackAction =
  | { type: typeof UPDATE; data: Partial<PlaybackState> }
  | { type: typeof UPDATE_TRACK; data: Partial<ActiveTrack> };

export default function playbackReducer(
  state: PlaybackState = defaultState,
  action: PlaybackAction
): PlaybackState {
  switch (action.type) {
    case UPDATE: {
      const next = { ...state, ...action.data };
      if (action.data.activeTrack) {
        next.activeTrack = { ...state.activeTrack, ...action.data.activeTrack };
      }
      return next;
    }
    case UPDATE_TRACK: {
      return {
        ...state,
        activeTrack: {
          ...state.activeTrack,
          ...action.data,
        },
      };
    }
    default:
      return state;
  }
}

export function updatePlayback(data: Partial<PlaybackState> = {}) {
  return {
    type: UPDATE,
    data,
  };
}

export function updatePlaybackTrack(data: Partial<ActiveTrack> = {}) {
  return {
    type: UPDATE_TRACK,
    data,
  };
}
