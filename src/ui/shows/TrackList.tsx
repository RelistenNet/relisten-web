'use client';

import { trackHref, type TrackRoute } from './trackHref';
import { href } from '@timber-js/app/routes';
import { Fragment, type ReactNode } from 'react';
import { durationToHHMMSS, removeLeadingZero } from '@/lib/utils';

import { sourceQuery, sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import type { ShowDetail, Source, SourceSet, Track } from '@/domain/types';
import Column from '@/ui/base/Column';
import Row from '@/ui/base/Row';
import RowHeader from '@/ui/base/RowHeader';
import Tag from '@/ui/base/Tag';
import { sortSources } from '@/lib/sortSources';
import { fromSourceParam, toSourceParam } from '@/lib/sourceParam';
import { useAdminTools } from '@/hooks/useAdminTools';
import { Link } from '@timber-js/app/client';
import { MapPin } from 'lucide-react';
import cn from '@/lib/cn';

// Styled like the column headers' filter toggles.
const VENUE_PILL = `
  flex min-w-0 items-center gap-1 rounded bg-column-header-text/5 p-1 text-[10px] normal-case
  text-column-header-text/70 transition-colors
`;

const getSetTime = (set: SourceSet): string =>
  durationToHHMMSS(
    set.tracks?.reduce((memo, next) => {
      return memo + (next?.duration ?? 0);
    }, 0)
  );

export type Props = {
  artistSlug?: string;
  year?: string;
  month?: string;
  day?: string;
} & {
  show?: Pick<ShowDetail, 'sources'> & Partial<Pick<ShowDetail, 'venue'>>;
  /** Which pages the track links go to (the site, or an embed). */
  trackRoute?: TrackRoute;
};

/** Web Audio load state of a track ('LOADED' means it can play gaplessly). */
export type TrackLoadState = 'NONE' | 'LOADING' | 'LOADED' | 'ERROR';

/** What's playing, from the player (src/ui doesn't read the player itself). */
export type PlayingTrack = {
  trackId: string;
  sourceId: string;
  /** Load states by track id, for the playing tape. */
  statuses: Record<string, TrackLoadState>;
};

interface SourceData {
  activeSourceId: string | undefined;
  displayDate: string | undefined;
  activeSourceObj: Source | undefined;
  sourcesData: Source[];
}

export const useSourceData = ({
  year,
  month,
  day,
  show,
  source,
}: Props & { source: string }): SourceData => {
  const displayDate = year && month && day ? [year, month, day].join('-') : undefined;

  const sourcesData = sortSources(show?.sources ?? []);

  // `?source=` is the v4 source id without its prefix; default to the top-sorted source.
  const wantedSourceId = fromSourceParam(source);
  const activeSourceObj = sourcesData.find((s) => s.id === wantedSourceId) ?? sourcesData[0];

  return {
    activeSourceId: activeSourceObj?.id,
    displayDate,
    activeSourceObj,
    sourcesData,
  };
};

const TrackList = ({
  playing,
  trackActions,
  ...props
}: Props & {
  playing?: PlayingTrack | null;
  /** Per-track controls beside the row (a "⋯" menu); src/ui doesn't know what they do. */
  trackActions?: (track: Track, source: Source) => ReactNode;
}) => {
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();
  const { activeSourceObj } = useSourceData({ ...props, source: sourceId });
  // Both are full v4 ids (`source_…`, `track_…`).
  const isActiveSourcePlaying = !!playing && activeSourceObj?.id === playing.sourceId;
  const adminTools = useAdminTools();
  const { artistSlug, year, month, day } = props;
  const show = artistSlug && year && month && day ? { artistSlug, year, month, day } : null;
  const venue = props.show?.venue;

  return (
    <Column
      heading={
        activeSourceObj ? (
          <span className="flex min-w-0 items-center gap-2 px-2">
            <span className="shrink-0">
              {`${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year?.slice(2)}`}
            </span>
            {venue?.name &&
              (artistSlug && venue.slug && (props.trackRoute ?? 'site') === 'site' ? (
                <Link
                  href={href('/artists/[artistSlug]/venues/[venueSlug]', {
                    artistSlug,
                    venueSlug: venue.slug,
                  })}
                  title={[venue.name, venue.location].filter(Boolean).join(' · ')}
                  className={cn(
                    VENUE_PILL,
                    'hover:bg-column-header-text/10 hover:text-column-header-text'
                  )}
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{venue.name}</span>
                </Link>
              ) : (
                <span className={VENUE_PILL} title={venue.location}>
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{venue.name}</span>
                </span>
              ))}
          </span>
        ) : (
          'Songs'
        )
      }
    >
      {activeSourceObj &&
        activeSourceObj.sets?.map((set, setIdx) => (
          <Fragment key={set.id}>
            {set.tracks?.map((track, trackIdx) => {
              const trackIsActive = isActiveSourcePlaying && track.id === playing.trackId;

              const loadState = isActiveSourcePlaying ? playing.statuses[track.id] : undefined;

              const actions = trackActions?.(track, activeSourceObj);
              return (
                <div key={track.id}>
                  {trackIdx === 0 && Number(activeSourceObj.sets?.length) > 1 && (
                    <RowHeader>
                      {set.name || `Set ${setIdx + 1}`} <div>{getSetTime(set)}</div>
                    </RowHeader>
                  )}
                  <div className="relative">
                    {adminTools && show && track.slug && (
                      <Link
                        href={href(
                          '/admin/clip/[artistSlug]/[year]/[month]/[day]/[songSlug]',
                          { ...show, songSlug: track.slug },
                          sourceQuery(activeSourceObj.id)
                        )}
                        prefetch={false}
                        title="Create clip"
                        className="
                          absolute top-1/2 right-10 z-10 -translate-y-1/2 rounded bg-surface px-1.5
                          py-0.5 text-xs hover:bg-surface-hover
                        "
                      >
                        {'✂'}
                      </Link>
                    )}
                    <Row
                      key={track.id}
                      href={
                        show && track.slug
                          ? trackHref(
                              props.trackRoute ?? 'site',
                              { ...show, songSlug: track.slug },
                              sourceQuery(activeSourceObj.id)
                            )
                          : undefined
                      }
                      active={trackIsActive}
                    >
                      <div>
                        <div>{track.title}</div>
                        {track.duration && (
                          <div className="text-xxs text-foreground-muted">
                            {durationToHHMMSS(track.duration)}
                          </div>
                        )}
                      </div>
                      <div className={actions ? 'shrink-0 pr-9 text-right' : 'shrink-0 text-right'}>
                        {loadState === 'LOADED' && <Tag variant="success">{'\u2713'} GAPLESS</Tag>}
                        {loadState === 'LOADING' && <Tag variant="warning">LOADING</Tag>}
                        {loadState === 'ERROR' && <Tag variant="error">ERROR</Tag>}
                      </div>
                    </Row>
                    {actions && (
                      <div className="absolute top-1/2 right-1 z-10 -translate-y-1/2">
                        {actions}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
      {activeSourceObj && <RowHeader>FIN</RowHeader>}
      {activeSourceObj &&
        activeSourceObj.links &&
        activeSourceObj.links.map((link) => (
          <a href={link.url} target="_blank" key={link.url} rel="noreferrer">
            <Row>{link.label}</Row>
          </a>
        ))}
    </Column>
  );
};

export default TrackList;
