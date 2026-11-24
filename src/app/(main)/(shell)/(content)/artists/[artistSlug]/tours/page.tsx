import { href } from '@timber-js/app/routes';
import { getSegmentParams, redirect } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// There are no tour pages; an artist's shows are on their Shows tab. Keeps old links working.
export default function ToursRedirect() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  redirect(href('/artists/[artistSlug]', { artistSlug }), { permanent: true });
}
