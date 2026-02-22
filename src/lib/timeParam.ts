/**
 * Formats seconds into a human-readable time param like "5m30s" or "1h2m30s".
 */
export function formatTimeParam(seconds: number): string {
  const total = Math.floor(seconds);
  if (total <= 0) return '0s';

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  let result = '';
  if (h > 0) result += `${h}h`;
  if (m > 0) result += `${m}m`;
  if (s > 0 || result === '') result += `${s}s`;
  return result;
}

/**
 * Parses a time param like "5m30s", "1h2m30s", or plain seconds "90" into seconds.
 */
export function parseTimeParam(value: string): number {
  // Try human-readable format: 1h2m30s, 5m30s, 45s, etc.
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (match && (match[1] || match[2] || match[3])) {
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseInt(match[3] || '0', 10);
    return h * 3600 + m * 60 + s;
  }

  // Fall back to plain number (seconds)
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}
