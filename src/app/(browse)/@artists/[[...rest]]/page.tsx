import type { PageOptions } from '@timber-js/app/server';
import ArtistsColumn from '@/features/browse/ArtistsColumn';

// The column depends on no request input: it renders once per document.
export const pageOptions = {
  lifetime: 'document',
  key: { segmentParams: [] },
} satisfies PageOptions;

export default function ArtistsSlot() {
  return <ArtistsColumn />;
}
