'use client';

import { Props, useSourceData } from '@/ui/shows/TrackList';
import { playShow } from './commands';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { tSearchParamsLoader } from '@/lib/searchParams/tSearchParam';
import { createShowDate } from '@/lib/utils';
import type { ShowDetail } from '@/domain/types';
import { usePathname } from '@timber-js/app/client';
import { useEffect, useEffectEvent } from 'react';

interface PlayerManagerProps extends Props {
  show?: ShowDetail;
  artistName?: string;
  playImmediately?: boolean;
  trackSlugs?: string[];
  songSlug?: string;
  // Server-resolved ?source. Prefer this over nuqs: after a pathname change nuqs
  // returns the previous URL's state for one render, so the effect below would see
  // the new track with the old (often empty) source.
  source?: string;
}

/**
 * A track page's URL means "play this tape from this track". The queue keeps
 * Next up; the same tape keeps its loaded audio; the track already playing
 * just resumes (which is also what happens when the URL follows playback).
 */
export default function PlayerManager(props: PlayerManagerProps) {
  const pathname = usePathname();
  const [{ source: querySourceId }] = sourceSearchParamsLoader.useQueryStates();
  const sourceId = props.source ?? querySourceId;
  const [{ t: seekTime }] = tSearchParamsLoader.useQueryStates();

  const pathParts = String(pathname)
    .replace(/^\/embed-track/, '')
    .replace(/^\/embed/, '')
    .replace(/^\//, '')
    .split('/');

  const artistSlug = props.artistSlug ?? pathParts[0];
  const year = props.year ?? pathParts[1];
  const month = props.month ?? pathParts[2];
  const day = props.day ?? pathParts[3];
  const songSlug = props.songSlug ?? pathParts[4];

  const { activeSourceObj } = useSourceData({ ...props, source: sourceId });

  // Non-reactive values (props, ?t=) are read at sync time; only the deps below re-trigger it.
  const syncPlayer = useEffectEvent(() => {
    const { show } = props;
    if (!activeSourceObj || !show || !artistSlug) return;

    if (typeof window.Notification !== 'undefined') {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    playShow({
      show: { ...show, date: show.date || createShowDate(year, month, day) },
      source: activeSourceObj,
      artistSlug,
      artistName: props.artistName ?? artistSlug.replace(/-/g, ' '),
      trackSlug: songSlug,
      trackSlugs: props.trackSlugs,
      play: props.playImmediately ?? true,
      startTime: seekTime,
    });
  });

  useEffect(() => {
    syncPlayer();
  }, [pathname, sourceId, activeSourceObj, props.trackSlugs, songSlug]);

  return null;
}
