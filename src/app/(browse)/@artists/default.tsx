import ArtistsColumn from '@/components/ArtistsColumn';
import { hideArtistsSearchParamsLoader } from '@/lib/searchParams/hideArtistsSearchParams';

interface ArtistsSlotProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ArtistsSlot({ searchParams }: ArtistsSlotProps) {
  const { hideArtists } = await hideArtistsSearchParamsLoader.parseAndValidate(searchParams);

  if (hideArtists) return null;

  return <ArtistsColumn />;
}
