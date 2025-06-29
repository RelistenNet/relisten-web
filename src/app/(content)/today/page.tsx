import TodayTrack from '@/components/TodayTrack';
import RelistenAPI from '@/lib/RelistenAPI';
import { getCurrentMonthDay } from '@/lib/timezone';
import { groupBy } from '@/lib/utils';
import { Artist, Day } from '@/types';

export default async function Page() {
  const currentMonthDay = await getCurrentMonthDay();

  const data = await RelistenAPI.fetchTodayShows(currentMonthDay.month, currentMonthDay.day);

  const artists: Artist[] = data.map((day: Day) => ({
    ...day,
    artistName: day.artist?.name,
  }));
  const groupedBy: Day[][] = groupBy(artists, 'artistName');

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Today in History</h1>
        <div className="w-16 h-1 bg-relisten-600 rounded-full"></div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedBy).map(([artistName, days]) => (
          <div key={artistName}>
            <h2 className="text-xl font-semibold mb-4 text-relisten-700 border-l-4 border-relisten-500 pl-4">
              {artistName}
            </h2>
            <div className="space-y-0 border-l border-gray-200 ml-2">
              {days.map((day: Day) => (
                <TodayTrack day={day} key={day.id} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Today in History',
};
