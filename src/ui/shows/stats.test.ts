import { describe, expect, it } from 'vitest';
import { formatShowDate, timeAgo } from './stats';

describe('show date labels', () => {
  it('formats complete calendar dates without shifting the day', () => {
    expect(formatShowDate('1977-05-08')).toBe('May 8, 1977');
    expect(formatShowDate('2000-02-29')).toBe('Feb 29, 2000');
    expect(timeAgo('1977-05-08')).toMatch(/ago$/);
  });

  it.each(['1970-07-XX', '1981-XX-XX', '1970-07', '1981', '2025-02-29'])(
    'preserves incomplete or invalid date %s without inventing an elapsed time',
    (date) => {
      expect(formatShowDate(date)).toBe(date);
      expect(timeAgo(date)).toBeUndefined();
    }
  );
});
