const REQUEST_RECENT_STREAMS = 'recent-streams/REQUEST_RECENT_STREAMS';
const RECEIVE_RECENT_STREAMS = 'recent-streams/RECEIVE_RECENT_STREAMS';

const defaultState = {
  data: [],
  meta: {
    firstNewId: null,
  },
};

export default function counter(state = defaultState, action) {
  switch (action.type) {
  case REQUEST_RECENT_STREAMS:
    return {
      data: state.data,
      meta: {
        ...state.meta,
        loading: true,
        error: false,
      },
    };
  case RECEIVE_RECENT_STREAMS:
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

export function requestRecentStreams() {
  return {
    type: REQUEST_RECENT_STREAMS,
  };
}

export function receiveRecentStreams(data) {
  return {
    type: RECEIVE_RECENT_STREAMS,
    data,
  };
}

export function fetchRecentStreams() {
  return async (dispatch, getState) => {
    dispatch(requestRecentStreams());

    const lastSeen = getState().recentStreams.data[0];
    let paramsStr = '';

    if (lastSeen) {
      paramsStr = `?lastSeenId=${lastSeen.id}`;
    }

    const json = await fetch(`https://relistenapi.alecgorge.com/api/v2/live/history${paramsStr}`)
      .then(res => res.json());

    return dispatch(receiveRecentStreams(json));
  };
}

export function scrobblePlay({ uuid }) {
  return () => {
    return fetch(`https://relistenapi.alecgorge.com/api/v2/live/play?track_uuid=${uuid}&app_type=web`, { method: 'post' })
      .then(res => res.json())
      .then(json => json);
  };
}
