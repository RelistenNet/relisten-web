import YearsColumn from '@/components/YearsColumn';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import RelistenAPI from '@/lib/RelistenAPI';
import SubartistTabs from '@/components/SubartistTabs';
import RecentTapesColumn from '@/components/RecentTapesColumn';
import TopTapesColumn from '@/components/TopTapesColumn';
import VenuesColumn from '@/components/VenuesColumn';
import ArtistSongsColumn from '@/components/ArtistSongsColumn';
import ToursColumn from '@/components/ToursColumn';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function YearsArtistSlot() {
  const { artistSlugs } = getSegmentParams(SEGMENT_PATH);

  const slug = artistSlugs?.[0] ?? 'grateful-dead';
  const segment = artistSlugs?.[1];

  if (isQuickHitSegment(segment)) {
    const artists = await RelistenAPI.fetchAllArtists();
    const artist = artists?.find((a) => a.slug === slug);
    const tabs = <SubartistTabs artistSlug={slug} features={artist?.features} />;

    switch (segment) {
      case 'recently-added':
        return <RecentTapesColumn artistSlug={slug} subHeader={tabs} />;
      case 'top':
        return <TopTapesColumn artistSlug={slug} subHeader={tabs} />;
      case 'venues':
        return <VenuesColumn artistSlug={slug} subHeader={tabs} />;
      case 'songs':
        return <ArtistSongsColumn artistSlug={slug} subHeader={tabs} />;
      case 'tours':
        return <ToursColumn artistSlug={slug} subHeader={tabs} />;
    }
  }

  return <YearsColumn artistSlug={slug} />;
}
