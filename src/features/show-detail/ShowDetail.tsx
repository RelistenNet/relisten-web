import { href } from '@timber-js/app/routes';
import { Link } from '@timber-js/app/client';
import { MapPinIcon } from 'lucide-react';
import cn from '@/lib/cn';
import { SongQueueProvider } from '@/player/SongQueue';
import { albumArtSearchParams } from '@/lib/searchParams/albumArtSearchParams';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { fromSourceParam } from '@/lib/sourceParam';
import { durationToHHMMSS, numberFormat, splitShowDate } from '@/lib/utils';
import { showLabel, songRowItem } from '@/player/queue/items';
import PageHeader, { type StatItem } from '@/ui/base/PageHeader';
import { showColumns } from '@/ui/shows/columns';
import { formatShowDate } from '@/ui/shows/stats';
import { VENUE_PILL } from '@/ui/shows/venuePill';
import DataTable from '@/ui/table/DataTable';
import { toTableState, type TableParams } from '@/ui/table/params';
import { queryTable } from '@/ui/table/query';
import { playColumn, positionColumn, queueColumn, titleColumn } from './columns';
import { loadShowDetail, trackRows } from './load';
import { SHOW_FILTER_IDS, showSearchParams, showTrackSpec, type ShowTrackRow } from './spec';

// A show: its venue and key numbers, then one tape's tracks in play order.

export default async function ShowDetail({
  artistSlug,
  showDate,
}: {
  artistSlug: string;
  showDate: string;
}) {
  const [{ show, row, sources }, params] = await Promise.all([
    loadShowDetail(artistSlug, showDate),
    showSearchParams.get(),
  ]);

  // `?source=` picks the tape; the top-sorted one otherwise, as on the browse view.
  const wanted = fromSourceParam((params as TableParams).source as string | undefined);
  const source = sources.find((s) => s.id === wanted) ?? sources[0];
  const rows = source ? trackRows(row, source) : [];

  const result = queryTable(rows, showTrackSpec, toTableState(params, SHOW_FILTER_IDS));
  // A row's play button queues the tracks on screen, in table order.
  const visibleItems = result.rows.flatMap((r) => songRowItem(r) ?? []);
  const pathname = href('/artists/[artistSlug]/shows/[showDate]', { artistSlug, showDate });
  const { year, month, day } = splitShowDate(show.date);
  const browseHref = href(
    '/[artistSlug]/[year]/[month]/[day]',
    { artistSlug, year, month, day },
    sourceQuery(source?.id)
  );
  const setCount = source?.sets.length ?? 0;

  const statItems: StatItem[] = [
    {
      label: 'Songs',
      value: numberFormat.format(rows.length),
      detail: setCount > 1 ? `${setCount} sets` : undefined,
    },
  ];
  if (source?.duration) {
    statItems.push({
      label: 'Length',
      value: durationToHHMMSS(source.duration),
      detail: source.isSoundboard ? 'Soundboard' : undefined,
    });
  }
  statItems.push({
    label: 'Tapes',
    value: numberFormat.format(show.tapes),
    detail:
      show.tapes > 1 ? (
        <Link href={browseHref} className="hover:text-accent">
          Compare tapes
        </Link>
      ) : undefined,
  });
  if (source && source.avgRating > 0) {
    const ratings = source.numRatings || source.numReviews;
    statItems.push({
      label: 'Rating',
      value: source.avgRating.toFixed(2),
      detail: ratings ? `${numberFormat.format(ratings)} ratings` : undefined,
    });
  }
  statItems.push({ label: 'Plays (30d)', value: numberFormat.format(show.plays30d) });

  const venue = show.venue;

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        cover={
          // Decorative: the title names the show. The background shows if the art fails.
          <img
            src={href(
              '/album-art/[showId].png',
              { showId: show.id },
              albumArtSearchParams.buildSearchParams({ size: '256' })
            )}
            alt=""
            width={64}
            height={64}
            className="size-14 rounded-lg bg-surface-recessed sm:size-16"
          />
        }
        title={formatShowDate(show.date)}
        meta={[
          venue?.name && <VenuePill key="venue" artistSlug={artistSlug} venue={venue} />,
          venue?.location,
          show.tourName,
        ]}
        stats={statItems}
      />

      <SongQueueProvider label={showLabel(row.artistName, show.date)} items={visibleItems}>
        <DataTable<ShowTrackRow>
          pathname={pathname}
          params={params}
          spec={showTrackSpec}
          result={result}
          columns={[playColumn, positionColumn, titleColumn, showColumns.length, queueColumn]}
          rowKey={(r) => r.id}
          rowHref={(r) => r.href}
          noun="song"
          controls={false}
        />
      </SongQueueProvider>
    </div>
  );
}

/** The venue, linking to its page for this artist (as in the browse view's show header). */
function VenuePill({
  artistSlug,
  venue,
}: {
  artistSlug: string;
  venue: { name?: string; slug?: string };
}) {
  const content = (
    <>
      <MapPinIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
      <span className="truncate">{venue.name}</span>
    </>
  );
  // Inline in the meta line, beside the location.
  const className = cn(VENUE_PILL, 'inline-flex max-w-full px-2 py-0.5 align-middle text-sm');
  return venue.slug ? (
    <Link
      href={href('/artists/[artistSlug]/venues/[venueSlug]', { artistSlug, venueSlug: venue.slug })}
      title={venue.name}
      className={cn(className, 'hover:bg-text-primary/10')}
    >
      {content}
    </Link>
  ) : (
    <span className={className} title={venue.name}>
      {content}
    </span>
  );
}

export async function showDetailMetadata({
  artistSlug,
  showDate,
}: {
  artistSlug: string;
  showDate: string;
}) {
  const detail = await loadShowDetail(artistSlug, showDate).catch(() => null);
  if (!detail) return {};
  const { show, row } = detail;
  return {
    title: [formatShowDate(show.date), show.venue?.name, row.artistName]
      .filter(Boolean)
      .join(' | '),
  };
}
