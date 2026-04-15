import TodayDateNav from '@/components/TodayDateNav';
import TodayTrack from '@/components/TodayTrack';
import RelistenAPI from '@/lib/RelistenAPI';
import { getCurrentMonthDay } from '@/lib/timezone';
import { Day } from '@/types';
import { searchParams } from './params';

export default async function Page() {
  const [currentMonthDay, parsed] = await Promise.all([getCurrentMonthDay(), searchParams.get()]);

  const month = parsed.month ?? currentMonthDay.month;
  const day = parsed.day ?? currentMonthDay.day;

  const data = await RelistenAPI.fetchTodayShows(month, day);

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
        <h1 className="mb-2 text-3xl font-semibold text-text-primary">Today in History</h1>
        <TodayDateNav month={month} day={day} pathname="/today" />
      </div>

      <div className="space-y-8">
        {Object.entries(groupedBy).map(([artistName, days]) => (
          <div key={artistName}>
            <h2 className="mb-4 border-l-4 border-accent pl-4 text-xl font-semibold text-accent">
              {artistName}
            </h2>
            <div className="ml-2 space-y-0 border-l border-hairline">
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
