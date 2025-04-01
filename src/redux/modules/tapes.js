import { HYDRATE } from 'next-redux-wrapper';

import { API_DOMAIN } from '../../lib/constants';
import { sortSources } from '@/lib/sortSources';

const REQUEST_TAPES = 'years/REQUEST_TAPES';
const RECEIVE_TAPES = 'years/RECEIVE_TAPES';

const defaultState = {};

export default function counter(state = defaultState, action) {
  switch (action.type) {
    case HYDRATE:
      return {
        ...state,
        ...action.payload?.tapes,
      };
    case REQUEST_TAPES:
      return {
        ...state,
        [action.artistSlug]: {
          ...state[action.artistSlug],
          [action.showDate]: {
            data: {},
            meta: {
              loaded: false,
              loading: true,
              error: false,
            },
          },
        },
      };
    case RECEIVE_TAPES:
      return {
        ...state,
        [action.artistSlug]: {
          ...state[action.artistSlug],
          [action.showDate]: {
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

export function requestTapes(artistSlug, year, showDate) {
  return {
    type: REQUEST_TAPES,
    artistSlug,
    year,
    showDate,
  };
}

export function receiveTapes(artistSlug, year, showDate, data) {
  return {
    type: RECEIVE_TAPES,
    artistSlug,
    year,
    showDate,
    data: {
      ...data,
      sources: sortSources(data.sources),
    },
  };
}

export function fetchTapes(artistSlug, year, showDate) {
  return (dispatch, getState) => {
    const state = getState().tapes[artistSlug];

    if (state && state[showDate] && state[showDate].meta.loaded) return {};

    // console.log('fetching tapes', artistSlug, year, showDate)

    dispatch(requestTapes(artistSlug, year, showDate));

    return fetch(`${API_DOMAIN}/api/v2/artists/${artistSlug}/years/${year}/${showDate}`)
      .then((res) => res.json())
      .then((json) => dispatch(receiveTapes(artistSlug, year, showDate, json)));
  };
}
