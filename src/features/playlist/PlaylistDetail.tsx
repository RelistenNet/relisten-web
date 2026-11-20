import type { ReactNode } from 'react';
import type { PlaylistContent } from '@/domain/playlists';
import { loadPlaylistView } from './load';
import PlaylistArticle from './PlaylistArticle';

/** A playlist's page (published, or a listener's own): its article, built on the server. */
export default async function PlaylistDetail({
  playlist,
  byline = [],
}: {
  playlist: PlaylistContent;
  /** The byline's leading items ("By alice", a link back, "Published"). */
  byline?: ReactNode[];
}) {
  const { view } = await loadPlaylistView(playlist);
  return <PlaylistArticle view={view} byline={byline} />;
}
