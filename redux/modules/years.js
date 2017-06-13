const REQUEST_YEARS = 'years/REQUEST_YEARS';
const RECEIVE_YEARS = 'years/RECEIVE_YEARS';

const defaultState = {
};

export default function counter(state = defaultState, action) {
  switch (action.type) {
    case REQUEST_YEARS:
      return {
        ...state,
        [action.artistSlug]: {
          data: [],
          meta: {
            loaded: false,
            loading: true,
            error: false
          }
        }
      };
    case RECEIVE_YEARS:
      return {
        ...state,
        [action.artistSlug]: {
          data: Array.isArray(action.data) ? action.data : [],
          meta: {
            loaded: true,
            loading: false,
            error: false
          }
        }
      };
    default:
      return state
  }
}

export function requestYears(artistSlug) {
  return {
    type: REQUEST_YEARS,
    artistSlug
  }
}

export function receiveYears(artistSlug, data) {
  return {
    type: RECEIVE_YEARS,
    artistSlug,
    data
  }
}

export function fetchYears(artistSlug) {
  return (dispatch, getState) => {
    const state = getState().years[artistSlug];
    if (state && state.meta.loaded) return {};
    console.log('fetching years', artistSlug)
    dispatch(requestYears(artistSlug))
    return fetch(`https://relistenapi.alecgorge.com/api/v2/artists/${artistSlug}/years`)
      .then(res => res.json())
      .then(json => dispatch(receiveYears(artistSlug, json)))
  }
}
