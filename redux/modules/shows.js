const REQUEST_SHOWS = 'years/REQUEST_SHOWS';
const RECEIVE_SHOWS = 'years/RECEIVE_SHOWS';

const defaultState = {
};

export default function counter(state = defaultState, action) {
  switch (action.type) {
    case REQUEST_SHOWS:
      return {
        ...state,
        [action.artistSlug]: {
          [action.year]: {
            data: {},
            meta: {
              loaded: false,
              loading: true,
              error: false
            }
          }
        }
      };
    case RECEIVE_SHOWS:
      return {
        ...state,
        [action.artistSlug]: {
          ...state[action.artistSlug],
          [action.year]: {
            data: action.data,
            meta: {
              loaded: true,
              loading: false,
              error: false
            }
          }
        }
      };
    default:
      return state
  }
}

export function requestShows(artistSlug, year) {
  return {
    type: REQUEST_SHOWS,
    artistSlug,
    year
  }
}

export function receiveShows(artistSlug, year, data) {
  return {
    type: RECEIVE_SHOWS,
    artistSlug,
    year,
    data
  }
}

export function fetchShows(artistSlug, year) {
  return (dispatch, getState) => {
    const state = getState().shows[artistSlug];
    if (state && state[year] && state[year].meta && state[year].meta.loaded) return {};
    console.log('fetching shows', artistSlug, year)
    dispatch(requestShows(artistSlug, year))
    return fetch(`https://relistenapi.alecgorge.com/api/v2/artists/${artistSlug}/years/${year}`)
      .then(res => res.json())
      .then(json => dispatch(receiveShows(artistSlug, year, json.data)))
  }
}
