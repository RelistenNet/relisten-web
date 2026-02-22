'use client';

import { ExternalLinkIcon } from 'lucide-react';
import { useSelector } from 'react-redux';
import player from '@/lib/player';
import { splitShowDate } from '@/lib/utils';
import Tooltip from '@/components/Tooltip';
import { formatTimeParam } from '@/lib/timeParam';

export default function EmbedHeader() {
  const playback = useSelector((state: any) => state.playback);

  const popout = (e: React.MouseEvent) => {
    e.preventDefault();

    const { artistSlug, showDate, songSlug, source, activeTrack } = playback;
    const hasTrack = artistSlug && showDate && songSlug;

    if (hasTrack) {
      const { year, month, day } = splitShowDate(showDate);
      const t = formatTimeParam(activeTrack?.currentTime || 0);
      const url = `https://relisten.net/${artistSlug}/${year}/${month}/${day}/${songSlug}?source=${source}&t=${t}`;
      window.open(url, '_blank');
      player.pauseAll();
    } else {
      window.open('https://relisten.net', '_blank');
    }
  };

  return (
    <div className="relative z-10 border-b py-2 text-center text-xs font-semibold tracking-wider">
      POWERED BY{' '}
      <a href="https://relisten.net" onClick={popout} className="hover:text-amber-700">
        RELISTEN.NET
      </a>{' '}
      &amp;{' '}
      <a
        href="https://phish.in"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-amber-700"
      >
        PHISH.IN
      </a>
      <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
        <Tooltip content="Continue listening to this show" align="right" contentClassName="w-52">
          <a
            href="https://relisten.net"
            onClick={popout}
            className="text-foreground-muted hover:text-amber-700"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLinkIcon size={12} />
          </a>
        </Tooltip>
      </div>
    </div>
  );
}
