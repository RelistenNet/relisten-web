'use client';

import { useRouter } from '@timber-js/app/client';
import { CloudOffIcon } from 'lucide-react';

// A deny(503) in a content page: a service it reads from (the User Service, for
// playlists) couldn't answer. Kept in the content layout, with a way to try again.

export default function Unavailable({ data }: { data?: { title?: string } }) {
  const router = useRouter();
  return (
    <div className="detail-page flex flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface-raised">
        <CloudOffIcon aria-hidden className="size-7 text-text-secondary" />
      </span>
      <h1 className="m-0 text-2xl font-semibold text-text-primary">
        {data?.title ?? 'This isn’t available right now'}
      </h1>
      <p className="m-0 max-w-md text-text-secondary">
        Relisten couldn’t reach the service it comes from. It’s usually back in a moment.
      </p>
      <button type="button" onClick={() => router.refresh()} className="header-action-primary">
        Try Again
      </button>
    </div>
  );
}
