'use client';

import player, { restoreLastPlayback } from '@/player/player';
import { PropsWithChildren, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux';
import AdminToolsInit from '@/shell/AdminToolsInit';
import { TooltipHost } from '@/ui/base/Tooltip';

export default function Providers({ children }: PropsWithChildren) {
  // After hydration, so the restored track doesn't change the first client render.
  useEffect(restoreLastPlayback, []);

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
      <TooltipHost>{children}</TooltipHost>
    </Provider>
  );
}
