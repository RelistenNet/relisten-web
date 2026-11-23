import { href } from '@timber-js/app/routes';
import { getSegmentParams, redirect } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

/** Moved to /playlists/{id}/edit: keep old links working. */
export default function Page() {
  const { playlistId } = getSegmentParams(SEGMENT_PATH);
  redirect(href('/playlists/[playlist]/edit', { playlist: playlistId }), { permanent: true });
}
