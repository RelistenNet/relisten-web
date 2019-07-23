const UPDATE_APP = 'app/UPDATE_APP';

const defaultState = {
  artistSlug: undefined,
  month: undefined,
  day: undefined,
  year: undefined,
  songSlug: undefined,
  source: undefined,
  isMobile: undefined,
};

export default function counter(state = defaultState, action) {
  switch (action.type) {
  case UPDATE_APP:
    return {
      ...state,
      ...action.data,
    };
  default:
    return state;
  }
}

export function updateApp(data = {}) {
  return {
    type: UPDATE_APP,
    data,
  };
}
