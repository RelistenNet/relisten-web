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

type LiveAction = { type: string };

export default function liveReducer(
  state: LiveState = defaultState,
  action: LiveAction
): LiveState {
  switch (action.type) {
    default:
      return state;
  }
}
