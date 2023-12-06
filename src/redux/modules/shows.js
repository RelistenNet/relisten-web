import { HYDRATE } from 'next-redux-wrapper';

const REQUEST_SHOWS = 'years/REQUEST_SHOWS';
const RECEIVE_SHOWS = 'years/RECEIVE_SHOWS';

const defaultState = {};

export default function counter(state = defaultState, action) {
  switch (action.type) {
    case HYDRATE:
      return {
        ...state,
        ...action.payload?.shows,
      };
    case REQUEST_SHOWS:
      return {
        ...state,
        [action.artistSlug]: {
          ...state[action.artistSlug],
          [action.year]: {
            data: {},
            meta: {
              loaded: false,
              loading: true,
              error: false,
            },
          },
        },
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
              error: false,
            },
          },
        },
      };
    default:
      return state;
  }
}

export function requestShows(artistSlug, year) {
  return {
    type: REQUEST_SHOWS,
    artistSlug,
    year,
  };
}

export function receiveShows(artistSlug, year, data) {
  return {
    type: RECEIVE_SHOWS,
    artistSlug,
    year,
    data,
  };
}
