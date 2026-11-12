'use client';

import { useCallback, useMemo } from 'react';
import type { ShowDetail, Source, Track } from '@/domain/types';
import TrackList, { type PlayingTrack, type Props } from '@/ui/shows/TrackList';
import { useCurrentItem, useTrackStatuses } from './hooks';
import { showTrackItem } from './queue/items';
import QueueMenu, { type QueueMenuLink } from './QueueMenu';
import { href } from '@timber-js/app/routes';

/** A link per song: a file can hold several (a segue). */
const songLinks = (artistSlug: string, track: Track): QueueMenuLink[] =>
  (track.songs ?? []).map((song) => ({
    label: `See all ${song.name}`,
    // The song page redirects an id to the song's slug.
    href: href('/artists/[artistSlug]/songs/[songSlug]', { artistSlug, songSlug: song.id }),
  }));

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
        <QueueMenu
          item={showTrackItem({ show, track, artistSlug, artistName })}
          links={songLinks(artistSlug, track)}
        />
      ) : null,
    [canQueue, show, artistSlug, artistName]
  );

  return (
    <TrackList {...props} playing={playing} trackActions={canQueue ? trackActions : undefined} />
  );
}
