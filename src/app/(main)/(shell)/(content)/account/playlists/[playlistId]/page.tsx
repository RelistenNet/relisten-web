import { href } from '@timber-js/app/routes';
import { getSegmentParams, redirect } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

/** A listener's own playlist moved to /playlists/{id}: keep old links working. */
export default function Page() {
  const { playlistId } = getSegmentParams(SEGMENT_PATH);
  redirect(href('/playlists/[playlist]', { playlist: playlistId }), { permanent: true });
}
