'use client';

import { useCallback, useMemo, type MouseEvent } from 'react';
import { usePathname } from '@timber-js/app/client';
import type { SongsShow, SongsSource, SongsTrack } from '@/lib/showProjection';
import TrackList, { type PlayingTrack, type Props } from '@/ui/shows/TrackList';
import { isShowPage } from '@/ui/shows/trackHref';
import { playShow } from './commands';
import { useCurrentItem, useTrackStatuses } from './hooks';
import { showTrackItem, songLinks } from './queue/items';
import QueueMenu from './QueueMenu';

/**
 * A tape's track list, marking the playing track and its tracks' load states,
 * with a Play next / Add to queue menu on each track (not in embeds, which
 * play one show).
 *
 * Clicking a track plays it from the tape this list already holds. On the
 * show's own pages the click goes no further: the URL follows playback
 * (runtime.ts, followPlayback), so nothing is fetched. Elsewhere (an artist's
 * random show) the row's link still takes the visitor to the show, and the
 * track page finds the track already playing.
 */
export default function PlayingTrackList({
  artistName,
  ...props
}: Props & { show?: SongsShow; artistName?: string }) {
  const current = useCurrentItem();
  const statuses = useTrackStatuses();
  const playing = useMemo<PlayingTrack | null>(
    () => (current ? { trackId: current.trackId, sourceId: current.sourceId, statuses } : null),
    [current, statuses]
  );

  const { show, artistSlug, year, month, day, trackRoute } = props;
  const pathname = usePathname();
  const canQueue = !!show && !!artistSlug && !!artistName && (trackRoute ?? 'site') === 'site';
  const trackActions = useCallback(
    (track: SongsTrack, source: SongsSource) =>
      canQueue && show && artistSlug && artistName ? (
        <QueueMenu
          item={showTrackItem({
            show,
            track: { ...track, sourceId: source.id },
            artistSlug,
            artistName,
          })}
          links={songLinks(artistSlug, track.songs)}
        />
      ) : null,
    [canQueue, show, artistSlug, artistName]
  );

  const onPlayTrack = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, track: SongsTrack, source: SongsSource) => {
      if (!show || !artistSlug || !year || !month || !day || !track.slug) return;
      playShow({
        show,
        source,
        artistSlug,
        artistName: artistName ?? artistSlug.replace(/-/g, ' '),
        trackSlug: track.slug,
      });
      if (isShowPage(pathname, { artistSlug, year, month, day })) event.preventDefault();
    },
    [show, artistSlug, artistName, year, month, day, pathname]
  );

  return (
    <TrackList
      {...props}
      playing={playing}
      trackActions={canQueue ? trackActions : undefined}
      onPlayTrack={onPlayTrack}
    />
  );
}
