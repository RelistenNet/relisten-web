import { loadArtists } from '@/features/browse/load';
import { loadTodayShows, type TodayShow } from '@/features/today/load';
import TodayDateNav from '@/ui/base/TodayDateNav';
import TodayIndex from '@/features/today/TodayIndex';
import TodayTrack from '@/features/today/TodayTrack';
import { getCurrentMonthDay } from '@/lib/timezone';
import slugify from 'slugify';
import { searchParams } from './params';

export default async function Page() {
  const [currentMonthDay, parsed] = await Promise.all([getCurrentMonthDay(), searchParams.get()]);

  const month = parsed.month ?? currentMonthDay.month;
  const day = parsed.day ?? currentMonthDay.day;

  const [data, allArtists] = await Promise.all([
    loadTodayShows(Number(month), Number(day)),
    loadArtists(),
  ]);

  const artistMeta = new Map(
    allArtists.map((a) => [a.name, { featured: a.featured, showCount: a.showCount }])
  );

  const groupedBy = data.reduce(
    (acc, show) => {
      const artistName = show.artist?.name || 'Unknown Artist';
      if (!acc[artistName]) {
        acc[artistName] = { slug: show.artist?.slug, days: [] };
      }
      acc[artistName].days.push(show);
      return acc;
    },
    {} as Record<string, { slug?: string; days: TodayShow[] }>
  );

  const sortedArtists = Object.entries(groupedBy)
    .map(([name, { slug, days }]) => {
      const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
      return [name, slug, sorted] as [string, string | undefined, TodayShow[]];
    })
    .sort(([aName], [bName]) => {
      const aMeta = artistMeta.get(aName) ?? { featured: 999, showCount: 0 };
      const bMeta = artistMeta.get(bName) ?? { featured: 999, showCount: 0 };
      const rank = (f: number) => (f === 1 ? 0 : f === 0 ? 1 : 2);
      const aRank = rank(aMeta.featured);
      const bRank = rank(bMeta.featured);
      if (aRank !== bRank) return aRank - bRank;
      if (aMeta.showCount !== bMeta.showCount) return bMeta.showCount - aMeta.showCount;
      return aName.localeCompare(bName);
    });

  const artistAnchors = sortedArtists.map(([artistName, slug, days]) => ({
    name: artistName,
    anchor: slug || slugify(artistName, { lower: true, strict: true }),
    count: days.length,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl flex-1">
      <div className="mb-10 md:hidden">
        <h1 className="mb-2 text-3xl font-semibold text-text-primary">Today in History</h1>
        <TodayDateNav month={month} day={day} pathname="/today" />
      </div>

      <div className="flex items-start gap-10 md:mt-2">
        <TodayIndex items={artistAnchors} month={month} day={day} pathname="/today" />

        <div className="min-w-0 flex-1 space-y-10 pt-2">
          {sortedArtists.map(([artistName, , days], i) => (
            <div key={artistName} id={artistAnchors[i].anchor} className="scroll-mt-4">
              <h2 className="mb-1 text-lg font-semibold text-text-primary">{artistName}</h2>
              <p className="mb-4 text-sm text-text-muted">
                {days.length} {days.length === 1 ? 'show' : 'shows'}
              </p>
              <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-surface">
                {days.map((show) => (
                  <TodayTrack show={show} key={show.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Today in History',
};
