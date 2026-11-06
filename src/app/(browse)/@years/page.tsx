import YearsColumn from '@/features/browse/YearsColumn';

export default async function YearsArtistSlot() {
  const artistSlug = 'grateful-dead';

  return <YearsColumn artistSlug={artistSlug} />;
}
