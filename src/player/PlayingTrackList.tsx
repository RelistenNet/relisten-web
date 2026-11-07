'use client';

import { useCallback, useMemo } from 'react';
import type { ShowDetail, Source, Track } from '@/domain/types';
import TrackList, { type PlayingTrack, type Props } from '@/ui/shows/TrackList';
import { useCurrentItem, useTrackStatuses } from './hooks';
import { showTrackItem } from './queue/items';
import QueueMenu from './QueueMenu';

/**
 * A tape's track list, marking the playing track and its tracks' load states,
 * with a Play next / Add to queue menu on each track (not in embeds, which
 * play one show).
 */
export default function PlayingTrackList({
  artistName,
  ...props
}: Props & { show?: ShowDetail; artistName?: string }) {
  const current = useCurrentItem();
  const statuses = useTrackStatuses();
  const playing = useMemo<PlayingTrack | null>(
    () => (current ? { trackId: current.trackId, sourceId: current.sourceId, statuses } : null),
    [current, statuses]
  );

  const { show, artistSlug, trackRoute } = props;
  const canQueue = !!show && !!artistSlug && !!artistName && (trackRoute ?? 'site') === 'site';
  const trackActions = useCallback(
    (track: Track, _source: Source) =>
      canQueue && show && artistSlug && artistName ? (
        <QueueMenu item={showTrackItem({ show, track, artistSlug, artistName })} />
      ) : null,
    [canQueue, show, artistSlug, artistName]
  );

  return (
    <TrackList {...props} playing={playing} trackActions={canQueue ? trackActions : undefined} />
  );
}
