import TodayTrack from '../../../../components/TodayTrack';
import { API_DOMAIN } from '../../../../lib/constants';
import { groupBy } from '../../../../lib/utils';
import { Artist, Day } from '../../../../types';

export default async function Page() {
  const data: Day[] = await fetch(`${API_DOMAIN}/api/v2/shows/today`, {
    cache: 'no-cache', // seconds
  }).then((res) => res.json());

  const artists: Artist[] = data.map((day: Day) => ({
    ...day,
    artistName: day.artist?.name,
  }));
  const groupedBy: Day[][] = groupBy(artists, 'artistName');

  return (
    <div className="mx-auto w-full max-w-screen-md flex-1">
      <h1 className="my-4 text-4xl font-semibold">Today in History</h1>
      {Object.entries(groupedBy).map(([artistName, days]) => (
        <div key={artistName}>
          <div className="p-4 pl-0 text-2xl font-semibold">{artistName}</div>
          <div>
            {days.map((day: Day) => (
              <TodayTrack day={day} key={day.id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export const metadata = {
  title: 'Today in History',
};
