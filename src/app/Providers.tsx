'use client';

import player from '@/lib/player';
import { PropsWithChildren, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux';
import AdminToolsInit from '@/components/AdminToolsInit';

export default function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Guard: player proxy returns undefined for methods when
      // initGaplessPlayer() hasn't been called yet (no track loaded).
      if (!player.togglePlayPause) return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable)
        return;

      if (e.code === 'Space') {
        e.preventDefault();
        player.togglePlayPause();
      }
      if (e.code === 'ArrowRight') {
        player.next();
      }
      if (e.code === 'ArrowLeft') {
        player.previous();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Provider store={store}>
      <AdminToolsInit />
      {children}
    </Provider>
  );
}
