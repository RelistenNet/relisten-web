'use client';

import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { tSearchParamsLoader } from '@/lib/searchParams/tSearchParam';
import { toSourceParam } from '@/lib/sourceParam';

/** A track link that opens at the playing tape and position. */
const shareSearchParams = sourceSearchParamsLoader.extend(tSearchParamsLoader.codecs);
import { ExternalLinkIcon } from 'lucide-react';
import { pause } from '@/player/commands';
import { useCurrentItem } from '@/player/hooks';
import { playbackActor } from '@/player/runtime';
import { splitShowDate } from '@/lib/utils';
import Tooltip from '@/ui/base/Tooltip';
import { formatTimeParam } from '@/lib/timeParam';

export default function EmbedHeader({ compact = false }: { compact?: boolean }) {
  const current = useCurrentItem();
  const isPhish = current?.artistSlug === 'phish';

  const popout = (e: React.MouseEvent) => {
    e.preventDefault();

    if (current?.trackSlug) {
      const { artistSlug, trackSlug, sourceId } = current;
      const { year, month, day } = splitShowDate(current.date);
      // Read at click time: position isn't worth re-rendering the header for.
      const { currentTime } = playbackActor.getSnapshot().context;
      const url = shareSearchParams.href(
        `https://relisten.net/${artistSlug}/${year}/${month}/${day}/${trackSlug}`,
        { source: toSourceParam(sourceId), t: currentTime || 0 }
      );
      window.open(url, '_blank');
      pause();
    } else {
      window.open('https://relisten.net', '_blank');
    }
  };

  return (
    <div
      className={`relative z-10 border-t border-gray-200 text-center font-semibold tracking-wider text-gray-900 ${compact ? 'py-1 text-[10px]' : 'border-b py-2 text-xs'}`}
    >
      POWERED BY{' '}
      <a
        href="https://relisten.net"
        onClick={popout}
        className="text-gray-900 hover:text-amber-700"
      >
        RELISTEN.NET
      </a>
      {isPhish && (
        <>
          {' '}
          &amp;{' '}
          <a
            href="https://phish.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-700"
          >
            PHISH.IN
          </a>
        </>
      )}
      <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
        <Tooltip content="Continue listening to this show" align="top" contentClassName="w-52">
          <a
            href="https://relisten.net"
            onClick={popout}
            className="text-gray-500 hover:text-amber-700"
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
