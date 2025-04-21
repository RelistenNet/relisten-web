'use client';

import { durationToHHMMSS, removeLeadingZero } from '../lib/utils';

import { RawParams } from '@/app/(main)/(home)/layout';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Set, Source, Tape } from '../types';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';

const getSetTime = (set: Set): string =>
  durationToHHMMSS(
    set.tracks?.reduce((memo, next) => {
      return memo + (next?.duration ?? 0);
    }, 0)
  );

export type Props = Pick<RawParams, 'artistSlug' | 'year' | 'month' | 'day'> & {
  show?: Partial<Tape>;
};

interface SourceData {
  gaplessTracksMetadata: any;
  activePlaybackSourceId: any;
  activeSourceId: number | undefined;
  isActiveSourcePlaying: boolean;
  activePlaybackTrackId?: number;
  displayDate: any;
  activeSourceObj: Source | undefined;
  sourcesData: any;
}

export const useSourceData = ({
  year,
  month,
  day,
  show,
  source,
}: Props & { source: string }): SourceData => {
  const activePlaybackSourceId = useSelector(({ playback }) =>
    playback.source ? parseInt(playback.source, 10) : undefined
  );
  const activePlaybackTrackId = useSelector(({ playback }) => playback.activeTrack?.id);
  const gaplessTracksMetadata = useSelector(({ playback }) => playback.gaplessTracksMetadata);

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
    sourcesData: show?.sources ?? [],
  };
};

const SongsColumn = (props: Props) => {
  const sourceId = String(useSearchParams().get('source'));
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
                  href={`/${props.artistSlug}/${props.year}/${props.month}/${props.day}/${track.slug}?source=${activeSourceObj.id}`}
                  isActiveOverride={trackIsActive}
                >
                  <div>
                    <div>{track.title}</div>
                    {track.duration && (
                      <div className="text-xxs text-gray-400">
                        {durationToHHMMSS(track.duration)}
                      </div>
                    )}
                  </div>
                  <div className="text-xxs min-w-[20%] text-right text-gray-400">
                    <div>
                      {trackMetadata && trackMetadata.webAudioLoadingState !== 'NONE'
                        ? trackMetadata.webAudioLoadingState
                        : ''}
                    </div>
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
