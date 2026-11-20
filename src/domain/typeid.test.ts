import { describe, expect, it } from 'vitest';
import { isTypeId, newTypeId } from './typeid';

describe('newTypeId', () => {
  it('is a prefix and 26 base32 characters of a UUIDv7', () => {
    const id = newTypeId('playlist_entry');
    expect(id).toMatch(/^playlist_entry_[0-7][0-9a-hjkmnp-tv-z]{25}$/);
    expect(isTypeId(id, 'playlist_entry')).toBe(true);
    // Not another prefix that it starts like.
    expect(isTypeId(newTypeId('playlist_segment'), 'playlist')).toBe(false);
  });

  it('encodes version 7, the variant, and the timestamp', () => {
    const now = Date.UTC(2026, 10, 20);
    const suffix = newTypeId('playlist', now).slice('playlist_'.length);
    // Decode the 130 bits (two leading zeros) back into the UUID's 32 hex digits.
    const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';
    const bits = [...suffix]
      .map((c) => alphabet.indexOf(c).toString(2).padStart(5, '0'))
      .join('')
      .slice(2);
    const hex = (bits.match(/.{4}/g) ?? []).map((n) => parseInt(n, 2).toString(16)).join('');
    expect(parseInt(hex.slice(0, 12), 16)).toBe(now);
    expect(hex[12]).toBe('7');
    expect(['8', '9', 'a', 'b']).toContain(hex[16]);
  });

  it('sorts by creation time', () => {
    const earlier = newTypeId('command', 1_000);
    const later = newTypeId('command', 2_000);
    expect(earlier < later).toBe(true);
  });
});
