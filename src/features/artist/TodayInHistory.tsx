import { loadOnDate } from './load';
import { findArtistBySlug } from '@/data/artists';
import ArtistShowList from './ArtistShowList';
import { showColumns } from '@/ui/shows/columns';
import TodayDateNav from '@/ui/base/TodayDateNav';
import { getCurrentMonthDay } from '@/lib/timezone';
import { artistTodayUrl } from '@/lib/urls';
import { numberFormat } from '@/lib/utils';
import { dateSearchParams } from '@/lib/searchParams/dateSearchParam';
import { deny } from '@timber-js/app/server';
import { format } from 'date-fns';

// Shows on this calendar date in past years: today in the viewer's timezone,
// or ?month=&day=.

export default async function TodayInHistory({ artistSlug }: { artistSlug: string }) {
  const [artist, parsed, today] = await Promise.all([
    findArtistBySlug(artistSlug),
    dateSearchParams.get(),
    getCurrentMonthDay(),
  ]);
  if (!artist) deny(404);

  const month = parsed.month ?? Number(today.month);
  const day = parsed.day ?? Number(today.day);
  const rows = await loadOnDate(artistSlug, month, day);
  const years = rows.map((r) => r.date.slice(0, 4)).sort();

  return (
    <ArtistShowList
      artist={artist}
      title="Today In History"
      stats={[
        { label: 'Shows', value: numberFormat.format(rows.length) },
        ...(years.length > 1 ? [{ label: 'Years', value: `${years[0]}–${years.at(-1)}` }] : []),
      ]}
      aside={
        <TodayDateNav
          month={String(month)}
          day={String(day)}
          pathname={artistTodayUrl(artistSlug)}
        />
      }
      rows={rows}
      columns={[showColumns.show, showColumns.tapes, showColumns.rating, showColumns.plays]}
      defaultSort={{ id: 'date', dir: 'asc' }}
      pathname={artistTodayUrl(artistSlug)}
      extraParams={parsed.month && parsed.day ? { month, day } : undefined}
    />
  );
}

export async function todayInHistoryMetadata({ artistSlug }: { artistSlug: string }) {
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Today In History | ${artist.name}` } : {};
}
