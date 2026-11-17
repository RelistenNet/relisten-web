import { loadBrowseTargetFor } from '@/lib/browseTarget';
import { showMetadata } from '@/lib/showMetadata';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default () => null;

export const metadata = async () => {
  const target = await loadBrowseTargetFor(getSegmentParams(SEGMENT_PATH));
  return target.kind === 'show' ? showMetadata(target) : {};
};
