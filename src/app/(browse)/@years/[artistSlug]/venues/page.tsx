import VenuesColumn from '@/components/VenuesColumn';
import SubartistTabs from '@/components/SubartistTabs';
import RelistenAPI from '@/lib/RelistenAPI';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function YearsVenuesSlot() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  if (!artistSlug) return null;

  const artists = await RelistenAPI.fetchAllArtists();
  const artist = artists?.find((a) => a.slug === artistSlug);
  const tabs = <SubartistTabs artistSlug={artistSlug} features={artist?.features} />;

  return <VenuesColumn artistSlug={artistSlug} subHeader={tabs} />;
}
