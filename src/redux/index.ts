import reducers from './modules';
import { configureStore } from '@reduxjs/toolkit';

declare global {
  interface Window {
    store: ReturnType<typeof configureStore>;
  }
}

export const store = configureStore({
  reducer: reducers,
});

if (typeof window !== 'undefined') {
  window.store = store;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
