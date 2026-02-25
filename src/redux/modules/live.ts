import { HYDRATE } from 'next-redux-wrapper';

export interface LiveState {
  data: unknown[];
  meta: {
    firstNewId: string | null;
  };
}

const defaultState: LiveState = {
  data: [],
  meta: {
    firstNewId: null,
  },
};

type LiveAction =
  | { type: typeof HYDRATE; payload?: { live?: Partial<LiveState> } }
  | { type: string };

export default function liveReducer(
  state: LiveState = defaultState,
  action: LiveAction
): LiveState {
  switch (action.type) {
    case HYDRATE:
      return {
        ...state,
        ...(action as { type: typeof HYDRATE; payload?: { live?: Partial<LiveState> } }).payload
          ?.live,
      };
    default:
      return state;
  }
}
