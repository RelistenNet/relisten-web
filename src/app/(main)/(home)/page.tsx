import ShowsColumn from '@/components/ShowsColumn';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import YearsColumn from '@/components/YearsColumn';
import { fetchRandomShow } from './[artistSlug]/page';

export default async function Page() {
  const artistSlug = 'grateful-dead';

  const randomShow = await fetchRandomShow(artistSlug);

  const { display_date } = randomShow ?? {};
  const [year, month, day] = display_date?.split('-') ?? [];

  if (!year || !month || !day) return null;

  return (
    <>
      <YearsColumn artistSlug={artistSlug} />
      <ShowsColumn artistSlug={artistSlug} year={year} />
      <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={randomShow} />
      <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={randomShow} />
    </>
  );
}
