'use client';

import { durationToHHMMSS, removeLeadingZero } from '../lib/utils';

import { useSuspenseQuery } from '@tanstack/react-query';
import ky from 'ky';
import { useSelector } from 'react-redux';
import { API_DOMAIN } from '../lib/constants';
import { Set, Source } from '../types';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import { useSearchParams, useSelectedLayoutSegment } from 'next/navigation';
import { RawParams } from '@/app/(main)/(home)/layout';

const getSetTime = (set: Set): string =>
  durationToHHMMSS(
    set.tracks?.reduce((memo, next) => {
      return memo + (next?.duration ?? 0);
    }, 0)
  );

const fetchSources = async (slug?: string, year?: string, displayDate?: string) => {
  if (!slug || !year || !displayDate) return { sources: [] };

  const parsed = await ky(
    `${API_DOMAIN}/api/v2/artists/${slug}/years/${year}/${displayDate}`
  ).json();

  return parsed;
};

export type Props = Pick<RawParams, 'artistSlug' | 'year' | 'month' | 'day'>;

interface SourceData {
  gaplessTracksMetadata: any;
  activePlaybackSourceId: any;
  isActiveSource: any;
  displayDate: any;
  activeSourceObj: Source | undefined;
  sourcesData: any;
}

export const useSourceData = ({
  year,
  month,
  day,
  artistSlug,
  source,
}: Props & { source: string }): SourceData => {
  const activePlaybackSourceId = useSelector(({ playback }) =>
    playback.source ? parseInt(playback.source, 10) : undefined
  );
  const gaplessTracksMetadata = useSelector(({ playback }) => playback.gaplessTracksMetadata);

  const displayDate = year && month && day ? [year, month, day].join('-') : undefined;

  const sources: any = useSuspenseQuery({
    queryKey: ['artists', artistSlug, displayDate],
    queryFn: () => fetchSources(artistSlug, year, displayDate),
    // enabled: !!artistSlug,
  });

  const activeSourceId = Number(source) || sources?.data?.sources?.[0]?.id;

  const activeSourceObj = sources.data?.sources?.find((source) => source.id === activeSourceId);
  const isActiveSource = activeSourceObj ? activeSourceObj?.id === activePlaybackSourceId : false;

  return {
    gaplessTracksMetadata,
    activePlaybackSourceId,
    isActiveSource,
    displayDate,
    activeSourceObj,
    sourcesData: sources?.data?.sources ?? [],
  };
};

const SongsColumn = (props: Props) => {
  const songSlug = useSelectedLayoutSegment();
  const sourceId = Number(useSearchParams()?.get('source'));

  const { gaplessTracksMetadata, isActiveSource, activeSourceObj } = useSourceData({
    ...props,
    source: String(sourceId),
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
      loadingAmount={12}
    >
      {activeSourceObj &&
        activeSourceObj.sets?.map((set, setIdx) =>
          set.tracks?.map((track, trackIdx) => {
            const trackIsActive = track.slug === songSlug && isActiveSource;

            const trackMetadata = isActiveSource
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
                  active={trackIsActive}
                  href={`/${props.artistSlug}/${props.year}/${props.month}/${props.day}/${track.slug}?source=${activeSourceObj.id}`}
                >
                  <div className={trackIsActive ? 'pl-2' : ''}>
                    <div>{track.title}</div>
                    {track.duration && (
                      <div className="text-[0.7em] text-gray-400">
                        {durationToHHMMSS(track.duration)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-[20%] text-right text-[0.7em] text-gray-400">
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
