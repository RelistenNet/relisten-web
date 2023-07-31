import { connect } from 'react-redux';

import { createShowDate, splitShowDate, durationToHHMMSS, removeLeadingZero } from '../lib/utils';

import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import { GaplessMetadata, Set, Source } from '../types';

const getSetTime = (set: Set): string =>
  durationToHHMMSS(
    set.tracks.reduce((memo, next) => {
      return memo + next.duration;
    }, 0)
  );

type SongsColumnProps = {
  source?: Source;
  loading?: boolean;
  artistSlug?: string;
  songSlug?: string;
  activePlaybackSourceId?: number;
  gaplessTracksMetadata?: GaplessMetadata[];
};

const SongsColumn = ({
  source,
  loading,
  artistSlug,
  songSlug,
  activePlaybackSourceId,
  gaplessTracksMetadata,
}: SongsColumnProps) => {
  const { year, month, day } = source
    ? splitShowDate(source.display_date)
    : { year: '', month: '', day: '' };
  const isActiveSource = source ? source.id === activePlaybackSourceId : false;

  return (
    <Column
      heading={
        source ? `${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(2)}` : 'Songs'
      }
      loading={loading}
      loadingAmount={12}
    >
      {source &&
        source.sets.map((set, setIdx) =>
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
                {trackIdx === 0 && source.sets.length > 1 && (
                  <RowHeader>
                    {set.name || `Set ${setIdx + 1}`} <div>{getSetTime(set)}</div>
                  </RowHeader>
                )}
                <Row
                  key={track.id}
                  active={trackIsActive}
                  href={`/${artistSlug}/${year}/${month}/${day}/${track.slug}?source=${source.id}`}
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
      {source && <RowHeader>FIN</RowHeader>}
      {source &&
        source.links &&
        source.links.map((link) => (
          <a href={link.url} target="_blank" key={link.id} rel="noreferrer">
            <Row>{link.label}</Row>
          </a>
        ))}
    </Column>
  );
};

const mapStateToProps = ({ tapes, app, playback }): SongsColumnProps | object => {
  const activeSourceId = parseInt(app.source, 10);
  const activePlaybackSourceId = parseInt(playback.source, 10);
  const showDate = createShowDate(app.year, app.month, app.day);
  const showTapes =
    tapes[app.artistSlug] && tapes[app.artistSlug][showDate]
      ? tapes[app.artistSlug][showDate]
      : null;
  let source: Source;

  if (!showTapes) return {};

  if (showTapes.data && showTapes.data.sources && showTapes.data.sources.length) {
    const { sources } = showTapes.data;

    source = sources.find((source: Source) => source.id === activeSourceId) || sources[0];
  }

  return {
    source,
    loading: showTapes.meta.loading,
    artistSlug: app.artistSlug,
    songSlug: playback.songSlug,
    gaplessTracksMetadata: playback.gaplessTracksMetadata,
    activePlaybackSourceId,
  };
};

export default connect(mapStateToProps)(SongsColumn);
