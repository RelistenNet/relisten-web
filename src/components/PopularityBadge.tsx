import { Music } from 'lucide-react';
import { formatNumber, formatHours } from '@/lib/formatPlays';
import Tooltip from './Tooltip';
import type { Popularity } from '@/types';
import cn from '@/lib/cn';

export default function PopularityBadge({
  popularity,
  align,
}: {
  popularity?: Popularity | null;
  align?: 'left' | 'right';
}) {
  const plays = popularity?.windows?.['30d']?.plays;
  if (plays == null) return null;

  return (
    <Tooltip
      className={cn('text-foreground-muted text-xxs flex items-center tracking-wide', {
        ['justify-end']: align === 'right',
      })}
      align={align}
      content={
        popularity?.windows && (
          <table className="text-foreground-muted text-xxs tabular-nums">
            <thead>
              <tr className="text-foreground">
                <th className="pr-3 text-right font-medium"></th>
                <th className="pr-3 text-right font-medium">Plays</th>
                <th className="text-right font-medium">Hours</th>
              </tr>
            </thead>
            <tbody>
              {(['48h', '7d', '30d'] as const).map((w) => {
                const data = popularity?.windows?.[w];
                return data ? (
                  <tr key={w}>
                    <td className="pr-3 text-right">{w}</td>
                    <td className="pr-3 text-right">{formatNumber(data.plays)}</td>
                    <td className="text-right">{formatHours(data.hours)}</td>
                  </tr>
                ) : null;
              })}
            </tbody>
          </table>
        )
      }
    >
      <div className="text-foreground-muted flex items-center gap-1 text-right">
        <Music className="size-3" />
        {formatNumber(plays)}
      </div>
    </Tooltip>
  );
}
