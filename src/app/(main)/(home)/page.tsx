import ShowsColumn from '@/components/ShowsColumn';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import YearsColumn from '@/components/YearsColumn';
import React from 'react';
import { fetchRandomShow } from './[artistSlug]/fetchRandomShow';
import { isMobile } from '@/lib/isMobile';

export default async function Page() {
  if (await isMobile()) return null;

  const artistSlug = 'grateful-dead';
  const randomShow = await fetchRandomShow(artistSlug);

  const { display_date } = randomShow ?? {};
  const [year, month, day] = display_date?.split('-') ?? [];

  if (!year || !month || !day) return null;

  return (
    <React.Fragment key={artistSlug}>
      <YearsColumn artistSlug={artistSlug} />
      <ShowsColumn artistSlug={artistSlug} year={year} />
      <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={randomShow} />
      <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={randomShow} />
    </React.Fragment>
  );
}
