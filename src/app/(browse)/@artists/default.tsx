import ArtistsColumn from '@/components/ArtistsColumn';

export default async function ArtistsSlot({ searchParams }) {
  console.log({ searchParams: await searchParams });
  return <ArtistsColumn />;
}
