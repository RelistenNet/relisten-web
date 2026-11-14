'use client';

import { next, previous, togglePlayPause } from '@/player/commands';
import { hydratePlayer } from '@/player/runtime';
import { PropsWithChildren, useEffect } from 'react';
import AdminToolsInit from '@/shell/AdminToolsInit';
import { TooltipHost } from '@/ui/base/Tooltip';

// Shortcuts would steal these elements' keystrokes.
const TYPING_TARGET = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
// Controls that Space activates. Only when focused from the keyboard: a mouse
// click leaves a button focused in Chrome, and Space should still pause then.
const SPACE_TARGET =
  ':is(button, summary, [role="button"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="option"], [role="tab"]):focus-visible';

export default function Providers({ children }: PropsWithChildren) {
  // After hydration, so the restored queue doesn't change the first client render.
  // Children's effects run first, so a track page has already started playing.
  useEffect(hydratePlayer, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(TYPING_TARGET)) return;

      if (e.code === 'Space') {
        // A focused control's own Space (click a button, toggle a checkbox) wins.
        if (target?.matches(SPACE_TARGET)) return;
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
