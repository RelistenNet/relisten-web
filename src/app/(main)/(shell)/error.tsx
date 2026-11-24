'use client';

// The app's error page, inside the shell: an unexpected error in a content
// page (account, playlists, songs, …) keeps the nav bar, as browse's
// ((browse)/error.tsx) does. The root boundary (src/app/error.tsx) sits above
// the shell, so it renders the page bare. An outage that pages expect (a
// User Service 503) has its own page: (content)/503.tsx.
export { default } from '@/app/error';
