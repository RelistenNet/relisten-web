import { splitPluralize } from '@/lib/utils';

/**
 * "12 tapes": a block with the number emphasized. The unit (and `suffix`) are
 * bare text in the muted wrapper rather than spans of their own, since list
 * rows render several of these each.
 */
export default function Count({
  unit,
  value,
  suffix,
}: {
  unit: string;
  value: number | undefined;
  suffix?: string;
}) {
  const [n, u] = splitPluralize(unit, value ?? 0);
  return (
    <div className="text-text-muted">
      <span className="font-medium text-foreground-muted">{n}</span> {u}
      {suffix && ` ${suffix}`}
    </div>
  );
}
