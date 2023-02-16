import { HYDRATE } from 'next-redux-wrapper';
import { API_DOMAIN } from '../../lib/constants';

const REQUEST_LIVE = 'live/REQUEST_LIVE';
const RECEIVE_LIVE = 'live/RECEIVE_LIVE';

const defaultState = {
  data: [],
  meta: {
    firstNewId: null,
  },
};

export default function counter(state = defaultState, action) {
  switch (action.type) {
    case HYDRATE:
      return {
        ...state,
        ...action.payload?.live,
      };
    case REQUEST_LIVE:
      return {
        data: state.data,
        meta: {
          ...state.meta,
          loading: true,
          error: false,
        },
      };
    case RECEIVE_LIVE:
      return {
        data: [...action.data.reverse(), ...state.data],
        meta: {
          ...state.meta,
          loading: true,
          error: false,
        },
      };
    default:
      return state;
  }
}

export function requestLive() {
  return {
    type: REQUEST_LIVE,
  };
}

export function receiveLive(data) {
  return {
    type: RECEIVE_LIVE,
    data,
  };
}

export function fetchLive() {
  return async (dispatch, getState) => {
    dispatch(requestLive());

    const lastSeen = getState().live.data[0];
    let paramsStr = '';

    if (lastSeen) {
      paramsStr = `?lastSeenId=${lastSeen.id}`;
    }

    const json = await fetch(`${API_DOMAIN}/api/v2/live/history${paramsStr}`)
      .then((res) => res.json())
      .catch(() => {});

    if (!json) return;

    return dispatch(receiveLive(json));
  };
}

export function scrobblePlay({ uuid }) {
  return () => {
    return fetch(`${API_DOMAIN}/api/v2/live/play?track_uuid=${uuid}&app_type=web`, {
      method: 'post',
    })
      .then((res) => res.json())
      .then((json) => json)
      .catch(() => {});
  };
}
