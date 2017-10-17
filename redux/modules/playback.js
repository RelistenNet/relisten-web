const UPDATE = 'playback/UPDATE';

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
    case UPDATE:
      return {
        ...state,
        ...action.data
      };
    default:
      return state
  }
}

export function updatePlayback(data = {}) {
  return {
    type: UPDATE,
    data
  }
}
