import { createStore, applyMiddleware, compose } from 'redux';
import { createWrapper } from 'next-redux-wrapper';

import thunk from 'redux-thunk';

import reducers from './modules';

const composeEnhancers =
  typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;

export const initStore = () => {
  const store = createStore(reducers, composeEnhancers(applyMiddleware(thunk)));

  if (typeof window !== 'undefined') {
    window.store = store;
  }

  return store;
};

// export an assembled wrapper
export const wrapper = createWrapper(initStore, { debug: false });
