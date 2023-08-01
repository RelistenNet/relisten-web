import { Suspense } from 'react';
import ArtistsColumn from '../../../components/ArtistsColumn';
import Column from '../../../components/Column';
import Flex from '../../../components/Flex';
import ShowsColumn from '../../../components/ShowsColumn';
import SongsColumn from '../../../components/SongsColumn';
import TapesColumn from '../../../components/TapesColumn';
import YearsColumn from '../../../components/YearsColumn';

export interface RawParams {
  artistSlug?: string;
  year?: string;
  month?: string;
  day?: string;
  songSlug?: string;
  source?: string;
}

export default function Page({
  params,
  searchParams,
}: {
  params: { anything: string[] };
  searchParams: { source: string };
}) {
  const { anything } = params;
  const { source } = searchParams;

  const [artistSlug, year, month, day, songSlug] = anything ?? [];

  return (
    <Flex className="flex-1 flex-row gap-8 overflow-y-auto px-4">
      <Suspense fallback={<Column heading="Artists" loading loadingAmount={20} />}>
        <ArtistsColumn artistSlug={artistSlug} />
      </Suspense>
      <Suspense fallback={<Column heading="Years" loading loadingAmount={20} />}>
        <YearsColumn artistSlug={artistSlug} year={year} />
      </Suspense>
      <Suspense fallback={<Column heading="Shows" loading loadingAmount={20} />}>
        <ShowsColumn artistSlug={artistSlug} year={year} month={month} day={day} />
      </Suspense>
      <Suspense fallback={<Column heading="Songs" loading loadingAmount={20} />}>
        <SongsColumn
          artistSlug={artistSlug}
          year={year}
          month={month}
          day={day}
          songSlug={songSlug}
          source={source}
        />
      </Suspense>
      <Suspense fallback={<Column heading="Sources" loading loadingAmount={20} />}>
        <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} source={source} />
      </Suspense>
    </Flex>
  );
}
