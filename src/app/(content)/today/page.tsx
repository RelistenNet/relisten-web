import TodayTrack from '@/components/TodayTrack';
import RelistenAPI from '@/lib/RelistenAPI';
import { getCurrentMonthDay } from '@/lib/timezone';
import { Day } from '@/types';

export default async function Page() {
  const currentMonthDay = await getCurrentMonthDay();

  const data = await RelistenAPI.fetchTodayShows(currentMonthDay.month, currentMonthDay.day);

  // Group by artist name manually since artist is a nested property
  const groupedBy = data.reduce(
    (acc, day) => {
      const artistName = day.artist?.name || 'Unknown Artist';
      if (!acc[artistName]) {
        acc[artistName] = [];
      }
      acc[artistName].push(day);
      return acc;
    },
    {} as Record<string, Day[]>
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-gray-900">Today in History</h1>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedBy).map(([artistName, days]) => (
          <div key={artistName}>
            <h2 className="text-relisten-700 mb-4 border-l-4 pl-4 text-xl font-semibold">
              {artistName}
            </h2>
            <div className="ml-2 space-y-0 border-l border-gray-200">
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
