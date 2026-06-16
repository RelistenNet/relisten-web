import YearsColumn from '@/components/YearsColumn';

export default async function YearsArtistSlot() {
  const artistSlug = 'grateful-dead';

  return <YearsColumn artistSlug={artistSlug} />;
}
