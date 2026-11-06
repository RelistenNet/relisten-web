'use client';

// Catch-all for route groups without their own 404 page ((stupid), (bare),
// admin). A deny(404) with no 404.tsx above it would otherwise fall through to
// error.tsx. (browse) and (content) keep their own, so their layouts stay.
export { default } from '@/shell/NotFound';

export const metadata = {
  title: '404 - Page Not Found',
};
