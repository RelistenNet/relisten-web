import { headers } from 'next/headers';
import parser from 'ua-parser-js';

import ShowsColumn from '@/components/ShowsColumn';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import YearsColumn from '@/components/YearsColumn';
import React from 'react';
import { fetchRandomShow } from './[artistSlug]/page';

export const isMobile = async () => {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');

  if (!userAgent) return false;

  const result = parser(userAgent);

  return result.device.type === 'mobile' || result.device.type === 'tablet';
};

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
