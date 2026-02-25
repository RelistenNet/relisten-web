import { createWrapper } from 'next-redux-wrapper';
import reducers from './modules';
import { configureStore } from '@reduxjs/toolkit';

declare global {
  interface Window {
    store: ReturnType<typeof initStore>;
  }
}

export const initStore = () => {
  const store = configureStore({
    reducer: reducers,
  });

  if (typeof window !== 'undefined') {
    window.store = store;
  }

  return store;
};

export const store = initStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// export an assembled wrapper
export const wrapper = createWrapper(initStore, { debug: false });
