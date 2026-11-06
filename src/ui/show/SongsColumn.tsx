'use client';

import { Fragment } from 'react';
import { durationToHHMMSS, removeLeadingZero } from '@/lib/utils';

import { RawParams } from '@/types/params';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { useSelector } from 'react-redux';
import type { ShowDetail, Source, SourceSet } from '@/domain/types';
import type { GaplessMetadata } from '@/redux/modules/playback';
import type { RootState } from '@/redux';
import Column from '@/ui/base/Column';
import Row from '@/ui/base/Row';
import RowHeader from '@/ui/base/RowHeader';
import Tag from '@/ui/base/Tag';
import { sortSources } from '@/lib/sortSources';
import { fromSourceParam, toSourceParam } from '@/lib/sourceParam';
import { useAdminTools } from '@/hooks/useAdminTools';
import { Link } from '@timber-js/app/client';

const getSetTime = (set: SourceSet): string =>
  durationToHHMMSS(
    set.tracks?.reduce((memo, next) => {
      return memo + (next?.duration ?? 0);
    }, 0)
  );

export type Props = Pick<RawParams, 'artistSlug' | 'year' | 'month' | 'day'> & {
  show?: Pick<ShowDetail, 'sources'>;
  routePrefix?: string;
};

interface SourceData {
  gaplessTracksMetadata: GaplessMetadata[];
  activePlaybackSourceId: string | undefined;
  activeSourceId: string | undefined;
  isActiveSourcePlaying: boolean;
  activePlaybackTrackId?: string;
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
  // The store holds the full v4 source id (`source_…`).
  const activePlaybackSourceId = useSelector(({ playback }: RootState) => playback.source);
  const activePlaybackTrackId = useSelector(({ playback }: RootState) => playback.activeTrack?.id);
  const gaplessTracksMetadata = useSelector(
    ({ playback }: RootState) => playback.gaplessTracksMetadata
  );

  const displayDate = year && month && day ? [year, month, day].join('-') : undefined;

  const sourcesData = sortSources(show?.sources ?? []);

  // `?source=` is the v4 source id without its prefix; default to the top-sorted source.
  const wantedSourceId = fromSourceParam(source);
  const activeSourceObj = sourcesData.find((s) => s.id === wantedSourceId) ?? sourcesData[0];

  return {
    gaplessTracksMetadata,
    activePlaybackSourceId,
    activeSourceId: activeSourceObj?.id,
    activePlaybackTrackId,
    isActiveSourcePlaying: activeSourceObj?.id === activePlaybackSourceId,
    displayDate,
    activeSourceObj,
    sourcesData,
  };
};

const SongsColumn = (props: Props) => {
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();
  const { gaplessTracksMetadata, isActiveSourcePlaying, activeSourceObj, activePlaybackTrackId } =
    useSourceData({
      ...props,
      source: sourceId,
    });
  const adminTools = useAdminTools();

  return (
    <Column
      heading={
        activeSourceObj
          ? `${removeLeadingZero(props.month)}/${removeLeadingZero(props.day)}/${props.year?.slice(
              2
            )}`
          : 'Songs'
      }
    >
      {activeSourceObj &&
        activeSourceObj.sets?.map((set, setIdx) => (
          <Fragment key={set.id}>
            {set.tracks?.map((track, trackIdx) => {
              const trackIsActive = track.id === activePlaybackTrackId && isActiveSourcePlaying;

              const trackMetadata = isActiveSourcePlaying
                ? gaplessTracksMetadata.find(
                    (gaplessTrack) =>
                      gaplessTrack.trackMetadata && gaplessTrack.trackMetadata.trackId === track.id
                  )
                : null;

              return (
                <div key={track.id} className="relative">
                  {trackIdx === 0 && Number(activeSourceObj.sets?.length) > 1 && (
                    <RowHeader>
                      {set.name || `Set ${setIdx + 1}`} <div>{getSetTime(set)}</div>
                    </RowHeader>
                  )}
                  {adminTools && track.slug && (
                    <Link
                      href={`/admin/clip/${props.artistSlug}/${props.year}/${props.month}/${props.day}/${track.slug}?source=${toSourceParam(activeSourceObj.id)}`}
                      prefetch={false}
                      title="Create clip"
                      className="
                        absolute top-1/2 right-1 z-10 -translate-y-1/2 rounded bg-surface px-1.5
                        py-0.5 text-xs hover:bg-surface-hover
                      "
                    >
                      {'✂'}
                    </Link>
                  )}
                  <Row
                    key={track.id}
                    href={`${props.routePrefix || ''}/${props.artistSlug}/${props.year}/${props.month}/${props.day}/${track.slug}?source=${toSourceParam(activeSourceObj.id)}`}
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
                    <div className="shrink-0 text-right">
                      {trackMetadata &&
                        (() => {
                          if (trackMetadata.webAudioLoadingState === 'LOADED')
                            return <Tag variant="success">{'\u2713'} GAPLESS</Tag>;
                          if (trackMetadata.webAudioLoadingState === 'LOADING')
                            return <Tag variant="warning">LOADING</Tag>;
                          if (trackMetadata.webAudioLoadingState === 'ERROR')
                            return <Tag variant="error">ERROR</Tag>;
                          return null;
                        })()}
                    </div>
                  </Row>
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

export default SongsColumn;
