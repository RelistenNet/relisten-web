import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import 'isomorphic-fetch'

import reducers from './modules'

export const initStore = (initialState) => {
  const store = createStore(reducers, initialState, applyMiddleware(thunk))

  if (typeof window !== 'undefined') {
    window.store = store
  }

  return store
}
