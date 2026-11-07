'use client';

import { useMemo } from 'react';
import TrackList, { type PlayingTrack, type Props } from '@/ui/shows/TrackList';
import { useCurrentItem, useTrackStatuses } from './hooks';

/** A tape's track list, marking the playing track and its tracks' load states. */
export default function PlayingTrackList(props: Props) {
  const current = useCurrentItem();
  const statuses = useTrackStatuses();
  const playing = useMemo<PlayingTrack | null>(
    () => (current ? { trackId: current.trackId, sourceId: current.sourceId, statuses } : null),
    [current, statuses]
  );
  return <TrackList {...props} playing={playing} />;
}
