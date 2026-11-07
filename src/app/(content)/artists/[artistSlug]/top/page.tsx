import { href } from '@timber-js/app/routes';
import { getSegmentParams, redirect } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';
import { tableSearchParams } from '@/ui/table/params';

// Top shows are the overview's show table sorted by rating; keep old links working.
export default function TopShowsRedirect() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  redirect(
    href(
      '/artists/[artistSlug]',
      { artistSlug },
      tableSearchParams([]).buildSearchParams({ sort: '-rating' })
    ),
    { permanent: true }
  );
}
