export function formatNumber(n: number | undefined | null): string {
  if (n == null) return '';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${+(n / 1000).toFixed(1)}k`;
  return `${+(n / 1_000_000).toFixed(1)}M`;
}

export function formatHours(n: number | undefined | null): string {
  if (n == null) return '';
  if (n < 1) return `${Math.round(n * 60)}m`;
  return `${formatNumber(+n.toFixed(0))}`;
}
