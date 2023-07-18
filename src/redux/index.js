import { createWrapper } from 'next-redux-wrapper';
import reducers from './modules';
import { configureStore } from '@reduxjs/toolkit';

export const initStore = () => {
  const store = configureStore({
    reducer: reducers
  });

  if (typeof window !== 'undefined') {
    window.store = store;
  }

  return store;
};

// export an assembled wrapper
export const wrapper = createWrapper(initStore, { debug: false });
