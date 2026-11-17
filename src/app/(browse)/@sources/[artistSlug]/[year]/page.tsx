import TapesColumn from '@/components/TapesColumn';
import { loadBrowseTargetFor } from '@/lib/browseTarget';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// A show reached through a quick-hit tab (/gd/songs?slug=&date=).
export default async function SourcesYearSlot() {
  const target = await loadBrowseTargetFor(getSegmentParams(SEGMENT_PATH));
  if (target.kind !== 'show' || !target.segment) return null;

  const { artistSlug, date, show, segment, slug } = target;
  return (
    <TapesColumn
      artistSlug={artistSlug}
      year={date.year}
      month={date.month}
      day={date.day}
      show={show}
      quickHitSegment={segment}
      quickHitSlug={slug}
    />
  );
}
