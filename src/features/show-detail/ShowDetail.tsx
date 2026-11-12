import { href } from '@timber-js/app/routes';
import { Link } from '@timber-js/app/client';
import { MapPinIcon } from 'lucide-react';
import cn from '@/lib/cn';
import { SongQueueProvider } from '@/player/SongQueue';
import { albumArtSearchParams } from '@/lib/searchParams/albumArtSearchParams';
import { fromSourceParam } from '@/lib/sourceParam';
import { durationToHHMMSS, numberFormat } from '@/lib/utils';
import { showLabel, songRowItem } from '@/player/queue/items';
import PageHeader, { type StatItem } from '@/ui/base/PageHeader';
import PopularityBadge from '@/ui/base/PopularityBadge';
import { formatShowDate } from '@/ui/shows/stats';
import { VENUE_PILL } from '@/ui/shows/venuePill';
import DataTable from '@/ui/table/DataTable';
import { toTableState, type TableParams } from '@/ui/table/params';
import { queryTable } from '@/ui/table/query';
import { lengthColumn, playColumn, positionColumn, queueColumn, titleColumn } from './columns';
import { loadShowDetail, trackRows } from './load';
import SourcesColumn from './SourcesColumn';
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

  const result = queryTable(rows, showTrackSpec, {
    ...toTableState(params, SHOW_FILTER_IDS),
    // Always play order: a stray `?sort=` (e.g. `-position`) doesn't reorder the tape.
    sort: undefined,
  });
  // A row's play button queues the tracks on screen, in table order.
  const visibleItems = result.rows.flatMap((r) => songRowItem(r) ?? []);
  const pathname = href('/artists/[artistSlug]/shows/[showDate]', { artistSlug, showDate });

  const statItems: StatItem[] = [];
  if (source?.duration) {
    statItems.push({ label: 'Runtime', value: durationToHHMMSS(source.duration) });
  }
  if (source && source.avgRating > 0) {
    const ratings = source.numRatings || source.numReviews;
    statItems.push({
      label: 'Rating',
      value: source.avgRating.toFixed(2),
      detail: ratings ? `${numberFormat.format(ratings)} ratings` : undefined,
    });
  }

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
          // The badge renders nothing without plays; skip it so no stray " · " shows.
          !!show.popularity?.windows?.['30d']?.plays && (
            <PopularityBadge
              key="plays"
              popularity={show.popularity}
              className="inline-flex align-middle text-base tracking-normal text-text-muted sm:text-sm"
            />
          ),
          show.tourName,
        ]}
        stats={statItems}
      />

      {/* The tracks, with the show's tapes beside them as in the browse view; stacked below lg. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <SongQueueProvider label={showLabel(row.artistName, show.date)} items={visibleItems}>
          <DataTable<ShowTrackRow>
            pathname={pathname}
            params={params}
            spec={showTrackSpec}
            result={result}
            columns={[playColumn, positionColumn, titleColumn, lengthColumn, queueColumn]}
            rowKey={(r) => r.id}
            rowHref={(r) => r.href}
            noun="song"
            controls={false}
          />
        </SongQueueProvider>
        {/* Sticky and scrolling on its own on lg, under the 50px nav bar and the page's margin. */}
        <div
          className="
            flex flex-col overflow-hidden rounded-lg border border-hairline
            lg:sticky lg:top-6 lg:max-h-[calc(100dvh-50px-3rem)]
            [&_.relisten-column]:min-h-0
          "
        >
          <SourcesColumn
            artistSlug={artistSlug}
            showDate={showDate}
            sources={sources.map((s) => ({ ...s, sets: [] }))}
          />
        </div>
      </div>
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
      href={href('/artists/[artistSlug]/venues/[venueSlug]', {
        artistSlug,
        venueSlug: venue.slug,
      })}
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
