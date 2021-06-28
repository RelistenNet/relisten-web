import { HYDRATE } from 'next-redux-wrapper';

const REQUEST_TODAY = 'today/REQUEST_TODAY';
const RECEIVE_TODAY = 'today/RECEIVE_TODAY';

const defaultState = {
  data: [],
  meta: {},
};

export default function counter(state = defaultState, action) {
  switch (action.type) {
    case HYDRATE:
      return {
        ...state,
        ...action.payload?.today,
      };
    case REQUEST_TODAY:
      return {
        data: state.data,
        meta: {
          ...state.meta,
          loading: true,
          error: false,
        },
      };
    case RECEIVE_TODAY:
      return {
        data: action.data,
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

export function requestToday() {
  return {
    type: REQUEST_TODAY,
  };
}

export function receiveToday(data) {
  return {
    type: RECEIVE_TODAY,
    data,
  };
}

export function fetchToday() {
  return (dispatch) => {
    dispatch(requestToday());
    return fetch('https://api.relisten.net/api/v2/shows/today')
      .then((res) => res.json())
      .then((json) => dispatch(receiveToday(json)));
  };
}
