import { deny } from '@timber-js/app/server';

export default function BrowserSessionDevelopmentPage() {
  if (process.env.NODE_ENV !== 'development') return deny(404);

  return (
    <main data-testid="browser-session-development-page">
      Relisten browser-session development harness
    </main>
  );
}
