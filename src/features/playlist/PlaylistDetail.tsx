import type { ReactNode } from 'react';
import type { PlaylistContent } from '@/domain/playlists';
import { loadPlaylistView } from './load';
import PlaylistArticle, { type PlaylistCrumb } from './PlaylistArticle';

/** A playlist's page (published, or a listener's own): its article, built on the server. */
export default async function PlaylistDetail({
  playlist,
  byline = [],
  actions,
  publicPlaylistId,
  crumb,
}: {
  playlist: PlaylistContent;
  /** The byline's leading items ("By alice", a link back, "Published"). */
  byline?: ReactNode[];
  /** At the top right (the owner's Edit). */
  actions?: ReactNode;
  /** The public page's: plays started there are credited to the playlist. */
  publicPlaylistId?: string;
  crumb?: PlaylistCrumb;
}) {
  const { view } = await loadPlaylistView(playlist);
  return (
    <PlaylistArticle
      view={view}
      byline={byline}
      actions={actions}
      publicPlaylistId={publicPlaylistId}
      crumb={crumb}
    />
  );
}
