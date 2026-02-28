'use client';

import { durationToHHMMSS, removeLeadingZero } from '../lib/utils';

import { RawParams } from '@/types/params';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { useSelector } from 'react-redux';
import { GaplessMetadata, Set, Source, Tape } from '../types';
import type { RootState } from '@/redux';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';
import { sortSources } from '@/lib/sortSources';

const getSetTime = (set: Set): string =>
  durationToHHMMSS(
    set.tracks?.reduce((memo, next) => {
      return memo + (next?.duration ?? 0);
    }, 0)
  );

export type Props = Pick<RawParams, 'artistSlug' | 'year' | 'month' | 'day'> & {
  show?: Partial<Tape>;
  routePrefix?: string;
};

interface SourceData {
  gaplessTracksMetadata: GaplessMetadata[];
  activePlaybackSourceId: number | undefined;
  activeSourceId: number | undefined;
  isActiveSourcePlaying: boolean;
  activePlaybackTrackId?: number;
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
  const activePlaybackSourceId = useSelector(({ playback }: RootState) =>
    playback.source ? parseInt(playback.source, 10) : undefined
  );
  const activePlaybackTrackId = useSelector(({ playback }: RootState) => playback.activeTrack?.id);
  const gaplessTracksMetadata = useSelector(
    ({ playback }: RootState) => playback.gaplessTracksMetadata
  );

  const displayDate = year && month && day ? [year, month, day].join('-') : undefined;

  const activeSourceId = Number(source) || show?.sources?.[0]?.id;

  const activeSourceObj = show?.sources?.find((source) => source.id === activeSourceId);

  return {
    gaplessTracksMetadata,
    activePlaybackSourceId,
    activeSourceId: activeSourceObj?.id,
    activePlaybackTrackId,
    isActiveSourcePlaying: activeSourceObj?.id === activePlaybackSourceId,
    displayDate,
    activeSourceObj,
    sourcesData: sortSources(show?.sources ?? []),
  };
};

const SongsColumn = (props: Props) => {
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();
  const { gaplessTracksMetadata, isActiveSourcePlaying, activeSourceObj, activePlaybackTrackId } =
    useSourceData({
      ...props,
      source: sourceId,
    });

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
        activeSourceObj.sets?.map((set, setIdx) =>
          set.tracks?.map((track, trackIdx) => {
            const trackIsActive = track.id === activePlaybackTrackId && isActiveSourcePlaying;

            const trackMetadata = isActiveSourcePlaying
              ? gaplessTracksMetadata.find(
                  (gaplessTrack) =>
                    gaplessTrack.trackMetadata && gaplessTrack.trackMetadata.trackId === track.id
                )
              : null;

            return (
              <div key={track.id}>
                {trackIdx === 0 && Number(activeSourceObj.sets?.length) > 1 && (
                  <RowHeader>
                    {set.name || `Set ${setIdx + 1}`} <div>{getSetTime(set)}</div>
                  </RowHeader>
                )}
                <Row
                  key={track.id}
                  href={`${props.routePrefix || ''}/${props.artistSlug}/${props.year}/${props.month}/${props.day}/${track.slug}?source=${activeSourceObj.id}`}
                  isActiveOverride={trackIsActive}
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
                    {trackMetadata && (() => {
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
          })
        )}
      {activeSourceObj && <RowHeader>FIN</RowHeader>}
      {activeSourceObj &&
        activeSourceObj.links &&
        activeSourceObj.links.map((link) => (
          <a href={link.url} target="_blank" key={link.id} rel="noreferrer">
            <Row>{link.label}</Row>
          </a>
        ))}
    </Column>
  );
};

export default SongsColumn;
