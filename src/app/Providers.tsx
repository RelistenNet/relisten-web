'use client';

import { next, previous, togglePlayPause } from '@/player/commands';
import { hydratePlayer } from '@/player/runtime';
import { PropsWithChildren, useEffect } from 'react';
import AdminToolsInit from '@/shell/AdminToolsInit';
import { TooltipHost } from '@/ui/base/Tooltip';

export default function Providers({ children }: PropsWithChildren) {
  // After hydration, so the restored queue doesn't change the first client render.
  // Children's effects run first, so a track page has already started playing.
  useEffect(hydratePlayer, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable)
        return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.code === 'ArrowRight') {
        next();
      }
      if (e.code === 'ArrowLeft') {
        previous();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <AdminToolsInit />
      <TooltipHost>{children}</TooltipHost>
    </>
  );
}
