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

  const [data, allArtists] = await Promise.all([
    RelistenAPI.fetchTodayShows(month, day),
    RelistenAPI.fetchAllArtists(),
  ]);

  const artistMeta = new Map(
    allArtists.map((a) => [a.name, { featured: a.featured ?? 999, show_count: a.show_count ?? 0 }])
  );

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

  const sortedArtists = Object.entries(groupedBy)
    .map(([name, days]) => {
      const sorted = [...days].sort((a, b) =>
        (a.display_date || '').localeCompare(b.display_date || '')
      );
      return [name, sorted] as [string, Day[]];
    })
    .sort(([aName], [bName]) => {
      const aMeta = artistMeta.get(aName) ?? { featured: 999, show_count: 0 };
      const bMeta = artistMeta.get(bName) ?? { featured: 999, show_count: 0 };
      const rank = (f: number) => (f === 1 ? 0 : f === 0 ? 1 : 2);
      const aRank = rank(aMeta.featured);
      const bRank = rank(bMeta.featured);
      if (aRank !== bRank) return aRank - bRank;
      if (aMeta.show_count !== bMeta.show_count) return bMeta.show_count - aMeta.show_count;
      return aName.localeCompare(bName);
    });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1">
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-semibold text-text-primary">Today in History</h1>
        <TodayDateNav month={month} day={day} pathname="/today" />
      </div>

      <div className="space-y-10">
        {sortedArtists.map(([artistName, days]) => (
          <div key={artistName}>
            <h2 className="mb-1 text-lg font-semibold text-text-primary">{artistName}</h2>
            <p className="mb-4 text-sm text-text-muted">
              {days.length} {days.length === 1 ? 'show' : 'shows'}
            </p>
            <div className="divide-y divide-hairline rounded-lg border border-hairline bg-surface">
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
