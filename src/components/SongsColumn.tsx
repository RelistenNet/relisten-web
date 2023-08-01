'use client';

import { durationToHHMMSS, removeLeadingZero } from '../lib/utils';

import { useSuspenseQuery } from '@tanstack/react-query';
import ky from 'ky';
import { useSelector } from 'react-redux';
import { RawParams } from '../app/(main)/(home)/[artistSlug]/[[...anything]]/page';
import { API_DOMAIN } from '../lib/constants';
import { Set } from '../types';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import { useSelectedLayoutSegment } from 'next/navigation';

const getSetTime = (set: Set): string =>
  durationToHHMMSS(
    set.tracks.reduce((memo, next) => {
      return memo + next.duration;
    }, 0)
  );

const fetchSources = async (slug?: string, year?: string, displayDate?: string) => {
  if (!slug || !year || !displayDate) return { sources: [] };

  const parsed = await ky(
    `${API_DOMAIN}/api/v2/artists/${slug}/years/${year}/${displayDate}`
  ).json();

  return parsed;
};

export type Props = Pick<RawParams, 'artistSlug' | 'year' | 'month' | 'day' | 'source'>;

export const useSourceData = ({ source, year, month, day, artistSlug }: Props) => {
  const activePlaybackSourceId = useSelector(({ playback }) =>
    playback.source ? parseInt(playback.source, 10) : undefined
  );
  const gaplessTracksMetadata = useSelector(({ playback }) => playback.gaplessTracksMetadata);

  const sourceObj = undefined;
  const displayDate = year && month && day ? [year, month, day].join('-') : undefined;

  const sources: any = useSuspenseQuery({
    queryKey: ['artists', artistSlug, displayDate],
    queryFn: () => fetchSources(artistSlug, year, displayDate),
    // enabled: !!artistSlug,
  });

  const activeSourceId = Number(source) || sources?.data?.sources?.[0]?.id;

  const activeSourceObj = sources.data?.sources?.find((source) => source.id === activeSourceId);
  const isActiveSource = sourceObj ? activeSourceObj?.id === activePlaybackSourceId : false;

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

  const { gaplessTracksMetadata, isActiveSource, activeSourceObj } = useSourceData(props);
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
        activeSourceObj.sets.map((set, setIdx) =>
          set.tracks.map((track, trackIdx) => {
            const trackIsActive = track.slug === songSlug && isActiveSource;
            const trackMetadata = isActiveSource
              ? gaplessTracksMetadata.find(
                  (gaplessTrack) =>
                    gaplessTrack.trackMetadata && gaplessTrack.trackMetadata.trackId === track.id
                )
              : null;

            return (
              <div key={track.id}>
                {trackIdx === 0 && activeSourceObj.sets.length > 1 && (
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
                      <div className="color-[#979797] text-[0.7em]">
                        {durationToHHMMSS(track.duration)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-[20%] text-right text-[0.7em] text-[#979797]">
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
