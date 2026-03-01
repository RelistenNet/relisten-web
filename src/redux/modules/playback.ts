import { HYDRATE } from 'next-redux-wrapper';
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

const defaultState: PlaybackState = {
  artistSlug: undefined,
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

type PlaybackAction =
  | { type: typeof HYDRATE; payload?: { playback?: Partial<PlaybackState> } }
  | { type: typeof UPDATE; data: Partial<PlaybackState> }
  | { type: typeof UPDATE_TRACK; data: Partial<ActiveTrack> };

export default function playbackReducer(
  state: PlaybackState = defaultState,
  action: PlaybackAction
): PlaybackState {
  switch (action.type) {
    case HYDRATE:
      return {
        ...state,
        ...action.payload?.playback,
      };
    case UPDATE:
      return {
        ...state,
        ...action.data,
      };
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
