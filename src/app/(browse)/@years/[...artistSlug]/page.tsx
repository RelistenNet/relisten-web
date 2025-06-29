import YearsColumn from '@/components/YearsColumn';

export default async function YearsArtistSlot({ params }) {
  const artistSlug = (await params).artistSlug ?? 'grateful-dead';

  return <YearsColumn artistSlug={artistSlug} />;
}
