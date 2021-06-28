import { HYDRATE } from 'next-redux-wrapper';

const UPDATE = 'playback/UPDATE';
const UPDATE_TRACK = 'playback/UPDATE_TRACK';

const defaultState = {
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

export default function counter(state = defaultState, action) {
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

export function updatePlayback(data = {}) {
  return {
    type: UPDATE,
    data,
  };
}

export function updatePlaybackTrack(data = {}) {
  return {
    type: UPDATE_TRACK,
    data,
  };
}
