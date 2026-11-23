import { href } from '@timber-js/app/routes';
import { redirect } from '@timber-js/app/server';
import { signInPageHref } from '@/lib/searchParams/sessionSearchParams';
import { sessionCookie } from '@/lib/session/sessionCookie';
import PageHeader from '@/ui/base/PageHeader';
import NewPlaylistForm from './NewPlaylistForm';
import { OWN_PLAYLISTS_CRUMB, PlaylistCrumbLink } from './PlaylistArticle';

/**
 * The New Playlist page: a name and an optional description, then the editor.
 * Signed out, it's the sign-in page first, which comes back here.
 */
export default function NewPlaylist() {
  if (sessionCookie.get() === null) redirect(signInPageHref(href('/playlists/new')));
  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        crumb={<PlaylistCrumbLink crumb={OWN_PLAYLISTS_CRUMB} />}
        title="New Playlist"
        meta={['Playlists are private until you publish them publicly']}
      />
      <NewPlaylistForm />
    </div>
  );
}
