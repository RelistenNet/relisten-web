'use client';

// Catch-all for the routes outside (main) ((stupid), admin, the embeds). A
// deny(404) with no 404.tsx above it would otherwise fall through to
// error.tsx. (main)/(shell) has its own, which keeps the nav.
export { default } from '@/shell/NotFound';

export const metadata = {
  title: '404 - Page Not Found',
};
