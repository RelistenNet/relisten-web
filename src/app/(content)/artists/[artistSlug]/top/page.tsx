import { artistTopShowsUrl } from '@/lib/urls';
import { getSegmentParams, redirect } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// Top shows are the overview's show table sorted by rating; keep old links working.
export default function TopShowsRedirect() {
  redirect(artistTopShowsUrl(getSegmentParams(SEGMENT_PATH).artistSlug), { permanent: true });
}
