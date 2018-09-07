const REQUEST_ARTISTS = 'artists/REQUEST_ARTISTS';
const RECEIVE_ARTISTS = 'artists/RECEIVE_ARTISTS';

const defaultState = {
  data: [],
  meta: {
    loading: false,
    loaded: false,
    error: false
  }
};

const bandsWithThe = ['duo', 'bernie-worrell', 'disco-biscuits', 'drive-by-truckers', 'g-nome', 'grateful-dead', 'jazz-mandolin-project', 'phish', 'sci', 'smashing-pumpkins', 'steve-kimock-band', 'stringdusters', 'tedeschi-trucks'];

export default function counter(state = defaultState, action) {
  switch (action.type) {
    case REQUEST_ARTISTS:
      return {
        ...state,
        meta: {
          ...state.meta,
          loading: true
        }
      };
    case RECEIVE_ARTISTS:
      return {
        data: action.data,
        meta: {
          ...state.meta,
          loaded: true,
          loading: true
        }
      };
    default:
      return state
  }
}

export function requestArtists() {
  return {
    type: REQUEST_ARTISTS
  }
}

export function receiveArtists(data) {
  const obj = {}

  data
    .map(artist => {
      const the = bandsWithThe.indexOf(artist.slug) !== -1;
      obj[artist.slug] = {
        ...artist,
        the,
      };
    });

  return {
    type: RECEIVE_ARTISTS,
    data: obj
  }
}

export function fetchArtists() {
  return (dispatch, getState) => {
    if (getState().artists.meta.loaded) return {};

    dispatch(requestArtists())
    return fetch('https://relistenapi.alecgorge.com/api/v2/artists')
      .then(res => res.json())
      .then(json => dispatch(receiveArtists(json)))
  }
}
