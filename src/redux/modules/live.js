import { HYDRATE } from 'next-redux-wrapper';
import { API_DOMAIN } from '../../lib/constants';

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
    default:
      return state;
  }
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
