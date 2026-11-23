import SearchPage, { searchMetadata } from '@/features/search/SearchPage';

/** Catalog search: /search?q=cornell+77&scope=shows */
export default function Page() {
  return <SearchPage />;
}

export const metadata = searchMetadata;
