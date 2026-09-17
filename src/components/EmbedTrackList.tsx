'use client';

import { useSelector } from 'react-redux';
import type { RootState } from '@/redux';
import type { Track } from '@/types';
import { durationToHHMMSS } from '@/lib/utils';
import player from '@/lib/player';

interface EmbedTrackListProps {
  tracks: Track[];
  startPosition: number;
}

export default function EmbedTrackList({ tracks, startPosition }: EmbedTrackListProps) {
  const activeTrackId = useSelector(({ playback }: RootState) => playback.activeTrack?.id);

  return (
    <div className="divide-y divide-gray-200 border-b border-gray-200">
      {tracks.map((track, i) => {
        const isActive = track.id === activeTrackId;
        const position = startPosition + i;

        return (
          <button
            key={track.id}
            type="button"
            onClick={() => {
              player.gotoTrack(i, true);
            }}
            className={`flex w-full items-center cursor-pointer gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
              isActive ? 'bg-amber-50' : ''
            }`}
          >
            <span className="w-5 text-right text-xs text-gray-400 tabular-nums">{position}</span>
            <span
              className={`flex-1 truncate ${
                isActive ? 'font-medium text-gray-900' : 'text-gray-700'
              }`}
            >
              {track.title}
            </span>
            {track.duration && (
              <span className="text-xs text-gray-400 tabular-nums">
                {durationToHHMMSS(track.duration)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
