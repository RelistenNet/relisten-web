import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

import reducers from './modules';

const composeEnhancers =
  typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;

export const initStore = (initialState) => {
  const store = createStore(reducers, initialState, composeEnhancers(applyMiddleware(thunk)));

  if (typeof window !== 'undefined') {
    window.store = store;
  }

  return store;
};
