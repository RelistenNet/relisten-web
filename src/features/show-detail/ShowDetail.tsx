import { href } from '@timber-js/app/routes';
import { Link } from '@timber-js/app/client';
import { deny } from '@timber-js/app/server';
import { MapPinIcon } from 'lucide-react';
import { Suspense } from 'react';
import { findArtistBySlug } from '@/data/artists';
import cn from '@/lib/cn';
import { SongQueueProvider } from '@/player/SongQueue';
import { fromSourceParam } from '@/lib/sourceParam';
import { showLabel, songRowItem } from '@/player/queue/items';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader from '@/ui/base/PageHeader';
import { formatShowDate } from '@/ui/shows/stats';
import { VENUE_PILL } from '@/ui/shows/venuePill';
import DataTable from '@/ui/table/DataTable';
import { toTableState, type TableParams } from '@/ui/table/params';
import { queryTable } from '@/ui/table/query';
import { lengthColumn, playColumn, queueColumn, titleColumn } from './columns';
import { loadShowDetail, trackRows } from './load';
import Reviews from './Reviews';
import SourcesColumn from './SourcesColumn';
import { SHOW_FILTER_IDS, showSearchParams, showTrackSpec, type ShowTrackRow } from './spec';

// A show: the artist, date, and venue, then one tape's tracks in play order and its reviews.

export default async function ShowDetail({
  artistSlug,
  showDate,
}: {
  artistSlug: string;
  showDate: string;
}) {
  const [{ show, row, sources }, artist, params] = await Promise.all([
    loadShowDetail(artistSlug, showDate),
    findArtistBySlug(artistSlug),
    showSearchParams.get(),
  ]);
  if (!artist) deny(404);

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

  const venue = show.venue;

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        cover={<ArtistCover artist={artist} />}
        title={
          <>
            {artist.name}{' '}
            <span className="font-normal text-text-muted">{formatShowDate(show.date)}</span>
          </>
        }
        meta={[venue?.name && <VenuePill key="venue" artistSlug={artistSlug} venue={venue} />]}
      />

      {/* The tracks, with the show's tapes beside them as in the browse view; stacked below lg. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <SongQueueProvider label={showLabel(row.artistName, show.date)} items={visibleItems}>
          <DataTable<ShowTrackRow>
            pathname={pathname}
            params={params}
            spec={showTrackSpec}
            result={result}
            columns={[playColumn, titleColumn, lengthColumn, queueColumn]}
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

      {/* Streams in after the tracks: a busy tape has hundreds of reviews. */}
      {source && source.numReviews > 0 && (
        <Suspense fallback={null}>
          <Reviews source={source} />
        </Suspense>
      )}
    </div>
  );
}

/** The venue and its location, linking to the venue's page for this artist (as in the browse view's show header). */
function VenuePill({
  artistSlug,
  venue,
}: {
  artistSlug: string;
  venue: { name?: string; slug?: string; location?: string };
}) {
  const label = [venue.name, venue.location].filter(Boolean).join(', ');
  const content = (
    <>
      <MapPinIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
      <span className="truncate">{venue.name}</span>
      {venue.location && (
        <span className="shrink-0 text-text-muted">
          <span aria-hidden>· </span>
          {venue.location}
        </span>
      )}
    </>
  );
  // Inline in the meta line under the title.
  const className = cn(VENUE_PILL, 'inline-flex max-w-full px-2 py-0.5 align-middle text-sm');
  return venue.slug ? (
    <Link
      href={href('/artists/[artistSlug]/venues/[venueSlug]', {
        artistSlug,
        venueSlug: venue.slug,
      })}
      title={label}
      className={cn(className, 'hover:bg-text-primary/10')}
    >
      {content}
    </Link>
  ) : (
    <span className={className} title={label}>
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
