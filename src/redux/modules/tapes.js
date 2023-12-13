import { HYDRATE } from 'next-redux-wrapper';
import { firstBy } from 'thenby';

import { API_DOMAIN } from '../../lib/constants';

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

const getEtreeId = (s = '') =>
  Number(
    s
      .split('.')
      .reverse()
      .find((x) => /^[0-9]+$/.test(x))
  );

// tapes: TODO: GD sort (charlie miller, sbd + etree id, weighted average), sbd + etree id, weighted avg, asc, desc
// for now, hardcode sort: sbd, charlie miller, etree id, weighted average
const sortTapes = (data = {}) => {
  const sortedTapes =
    data && data.sources
      ? [...data.sources].sort(
          firstBy((t) => t.is_soundboard, 'desc')
            // Charlie for GD, Pete for JRAD
            .thenBy((t) =>
              /(charlie miller)|(peter costello)/i.test(
                [t.taper, t.transferrer, t.source].join(''),
                'desc'
              )
            )
            .thenBy(
              (t1, t2) => getEtreeId(t1.upstream_identifier) - getEtreeId(t2.upstream_identifier),
              'desc'
            )
            .thenBy((t) => t.avg_rating_weighted, 'desc')
        )
      : [];

  return {
    ...(data || {}),
    sources: sortedTapes.reverse(),
  };
};

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
    data: sortTapes(data),
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
