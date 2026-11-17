import { loadBrowseTargetFor } from '@/lib/browseTarget';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// Every browse URL under an artist names one primary entity: a year, a show, a
// track, or a quick-hit list. Resolving it here, on the main chain, is what
// makes a missing one a real 404; a deny() in a column (a slot) only empties
// that column. The slots and pages read the same cached fetches afterwards.
export default async function access() {
  await loadBrowseTargetFor(getSegmentParams(SEGMENT_PATH));
}
