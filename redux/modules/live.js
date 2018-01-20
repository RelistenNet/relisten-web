const REQUEST_LIVE = 'live/REQUEST_LIVE';
const RECEIVE_LIVE = 'live/RECEIVE_LIVE';

const defaultState = {
  data: [],
  meta: {},
};

const merge = (newData = [], oldData = []) => {
  const newIds = newData.map(data => data.track.id);
  const cleanData = oldData.filter(data =>
    newIds.indexOf(data.track.id) === -1
  );

  return [
    ...cleanData,
    ...newData,
  ];
}

export default function counter(state = defaultState, action) {
  switch (action.type) {
    case REQUEST_LIVE:
      return {
        data: state.data,
        meta: {
          ...state.meta,
          loading: true,
          error: false
        }
      };
    case RECEIVE_LIVE:
      return {
        data: merge(action.data, state.data),
        meta: {
          ...state.meta,
          loading: true,
          error: false
        }
      };
    default:
      return state
  }
}

export function requestLive() {
  return {
    type: REQUEST_LIVE,
  }
}

export function receiveLive(data) {
  return {
    type: RECEIVE_LIVE,
    data
  }
}

export function fetchLive() {
  return (dispatch, getState) => {
    dispatch(requestLive())
    return fetch('https://relistenapi.alecgorge.com/api/v2/live/recently-played')
      .then(res => res.json())
      .then(json => dispatch(receiveLive(json)))
  }
}

export function scrobblePlay({ id }) {
  return (dispatch, getState) => {
    return fetch(`https://relistenapi.alecgorge.com/api/v2/live/play?track_id=${id}`, { method: 'post' })
      .then(res => res.json())
      .then(json => json)
  }
}
