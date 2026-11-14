import { formatNumber, formatHours } from '@/lib/formatPlays';
import Tooltip from './Tooltip';
import type { Popularity } from '@/domain/types';
import cn from '@/lib/cn';

export default function PopularityBadge({
  popularity,
  align,
  className,
}: {
  popularity?: Popularity | null;
  align?: 'left' | 'right';
  className?: string;
}) {
  const plays = popularity?.windows?.['30d']?.plays;
  if (!plays) return null;

  return (
    <Tooltip
      className={cn(
        'flex items-center gap-1 text-xxs tracking-wide text-foreground-muted',
        { ['justify-end']: align === 'right' },
        className
      )}
      align={align}
      content={
        popularity?.windows && (
          <table className="text-xxs text-foreground-muted tabular-nums">
            <thead>
              <tr className="text-foreground">
                <th className="pr-3 text-right font-medium">Playback</th>
                <th className="pr-3 text-right font-medium">Listens</th>
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
      {/* A CSS-mask icon (one element) rather than lucide's <Music> SVG (four):
          this badge renders on every row of the list columns. */}
      <span className="icon-music size-3" aria-hidden="true" />
      {formatNumber(plays)}
    </Tooltip>
  );
}
