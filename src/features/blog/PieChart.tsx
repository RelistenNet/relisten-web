export interface PieDatum {
  label: string;
  value: number;
  /** Optional hours played (full track length per play), shown in the tooltip. */
  hours?: number;
}

const SIZE = 200;
const R = SIZE / 2;

const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const formatNum = (n: number) => n.toLocaleString('en-US');

function slicePath(start: number, end: number): string {
  // Angles in turns (0..1), 0 = 12 o'clock, clockwise.
  if (end - start >= 0.9999) {
    return `M ${R} 0 A ${R} ${R} 0 1 1 ${R - 0.01} 0 Z`;
  }
  const point = (t: number) => {
    const a = t * 2 * Math.PI;
    return `${(R + R * Math.sin(a)).toFixed(3)} ${(R - R * Math.cos(a)).toFixed(3)}`;
  };
  const largeArc = end - start > 0.5 ? 1 : 0;
  return `M ${R} ${R} L ${point(start)} A ${R} ${R} 0 ${largeArc} 1 ${point(end)} Z`;
}

/**
 * Server-rendered SVG pie. Slices are drawn largest-first from 12 o'clock and
 * colored by input order (series slots 1..n), so identity never depends on rank.
 */
export default function PieChart({ data, caption }: { data: PieDatum[]; caption?: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const slices = data
    .map((d, i) => ({ ...d, slot: i + 1, share: d.value / total }))
    .sort((a, b) => b.value - a.value);

  const arcs = slices.map((s, i) => {
    const start = slices.slice(0, i).reduce((sum, p) => sum + p.share, 0);
    const end = start + s.share;
    // Tooltip anchor: just outside the slice's outer edge, at its mid-angle.
    // The tooltip then extends away from the pie, so it never covers it.
    const mid = ((start + end) / 2) * 2 * Math.PI;
    const sin = Math.sin(mid);
    const cos = Math.cos(mid);
    const x = 50 + 54 * sin;
    const y = 50 - 54 * cos;
    const tx = sin >= 0 ? '0%' : '-100%';
    const ty = Math.abs(cos) < 0.35 ? '-50%' : cos > 0 ? '-100%' : '0%';
    return { ...s, d: slicePath(start, end), x, y, tx, ty };
  });

  return (
    <figure className="viz-root my-10">
      <div
        className="
          flex flex-col items-center gap-8
          sm:flex-row sm:justify-center sm:gap-12
        "
      >
        <div className="viz-pie relative size-44 shrink-0 sm:size-48">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="size-full overflow-visible"
            role="img"
            aria-label={
              (caption ? `${caption}: ` : '') +
              slices.map((s) => `${s.label} ${formatPct(s.share)}`).join(', ')
            }
          >
            {arcs.map((s) => (
              <path
                key={s.label}
                d={s.d}
                data-slot={s.slot}
                tabIndex={0}
                aria-label={`${s.label}: ${formatNum(s.value)} plays, ${formatPct(s.share)}`}
                className="viz-slice outline-none"
                style={{ fill: `var(--series-${s.slot})` }}
              />
            ))}
          </svg>

          {arcs.map((s) => (
            <div
              key={s.label}
              data-slot={s.slot}
              aria-hidden
              className="
                viz-tip pointer-events-none absolute z-10 w-max rounded-md border border-hairline
                bg-surface-raised px-2.5 py-1.5 text-xs/snug text-foreground/70 shadow-lg
              "
              style={
                {
                  '--tip-x': `${s.x}%`,
                  '--tip-y': `${s.y}%`,
                  '--tip-tx': s.tx,
                  '--tip-ty': s.ty,
                } as React.CSSProperties
              }
            >
              <div className="mb-0.5 flex items-center gap-1.5 font-medium text-foreground">
                <span
                  className="inline-block size-2 rounded-[2px]"
                  style={{ background: `var(--series-${s.slot})` }}
                />
                {s.label}
              </div>
              <div className="tabular-nums">
                {formatNum(s.value)} plays &middot; {formatPct(s.share)}
              </div>
              {s.hours != null && (
                <div className="tabular-nums">{formatNum(Math.round(s.hours))} hours played</div>
              )}
            </div>
          ))}
        </div>

        <table className="viz-legend text-sm">
          <tbody>
            {slices.map((s) => (
              <tr key={s.label} data-slot={s.slot} className="viz-row">
                <td className="py-1 pr-3">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 rounded-[3px] align-middle"
                    style={{ background: `var(--series-${s.slot})` }}
                  />
                </td>
                <td className="py-1 pr-6 text-foreground">{s.label}</td>
                <td className="py-1 pr-4 text-right font-medium text-foreground tabular-nums">
                  {formatPct(s.share)}
                </td>
                <td className="py-1 text-right text-foreground/55 tabular-nums">
                  {formatNum(s.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <figcaption className="mt-6 text-center text-[13px] text-foreground/55">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
