import { loadOnDate } from './load';
import { findArtistBySlug } from '@/data/artists';
import ArtistShowList from '@/ui/show-table/ArtistShowList';
import { showColumns } from '@/ui/show-table/showColumns';
import TodayDateNav from '@/components/TodayDateNav';
import { getCurrentMonthDay } from '@/lib/timezone';
import { artistTodayUrl } from '@/lib/urls';
import { defineSearchParams } from '@timber-js/app/search-params';
import { deny } from '@timber-js/app/server';
import { format } from 'date-fns';
import { z } from 'zod/v4';

// Shows on this calendar date in past years: today in the viewer's timezone,
// or ?month=&day=.

const dateParams = defineSearchParams({
  month: z.coerce.number().int().min(1).max(12).optional(),
  day: z.coerce.number().int().min(1).max(31).optional(),
});

export default async function TodayInHistory({ artistSlug }: { artistSlug: string }) {
  const [artist, parsed, today] = await Promise.all([
    findArtistBySlug(artistSlug),
    dateParams.get(),
    getCurrentMonthDay(),
  ]);
  if (!artist) deny(404);

  const month = parsed.month ?? Number(today.month);
  const day = parsed.day ?? Number(today.day);
  const rows = await loadOnDate(artistSlug, month, day);
  // A leap year, so Feb 29 has a name.
  const label = format(new Date(2024, month - 1, day), 'MMMM d');

  return (
    <ArtistShowList
      artistSlug={artistSlug}
      artistName={artist.name}
      title={`Today In History: ${label}`}
      subtitle={`${rows.length} ${rows.length === 1 ? 'show' : 'shows'} on ${label} over the years.`}
      rows={rows}
      columns={[showColumns.show, showColumns.tapes, showColumns.rating, showColumns.plays]}
      defaultSort={{ id: 'date', dir: 'asc' }}
      pathname={artistTodayUrl(artistSlug)}
      extraParams={parsed.month && parsed.day ? { month, day } : undefined}
    >
      <div className="self-start">
        <TodayDateNav
          month={String(month)}
          day={String(day)}
          pathname={artistTodayUrl(artistSlug)}
        />
      </div>
    </ArtistShowList>
  );
}

export async function todayInHistoryMetadata({ artistSlug }: { artistSlug: string }) {
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Today In History | ${artist.name}` } : {};
}
