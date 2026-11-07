import { describe, expect, it } from 'vitest';
import { tableHref } from './params';

describe('tableHref', () => {
  it('applies the patch and resets to page 1', () => {
    expect(tableHref('/v', { q: 'msg', page: 3 }, { sort: '-date' })).toBe('/v?q=msg&sort=-date');
  });

  it('keeps the page when the patch is the page', () => {
    expect(tableHref('/v', { q: 'msg' }, { page: 2 })).toBe('/v?q=msg&page=2');
  });

  it('leaves out empty values and page 1', () => {
    expect(tableHref('/v', { q: 'msg', year: '1977' }, { q: '', page: 1 })).toBe('/v?year=1977');
    expect(tableHref('/v', { q: 'msg' }, { q: undefined })).toBe('/v');
  });

  it('keeps filter params', () => {
    expect(tableHref('/v', { sbd: '1' }, { year: '1977' })).toBe('/v?sbd=1&year=1977');
  });

  it('encodes values', () => {
    expect(tableHref('/v', {}, { q: 'a&b c' })).toBe('/v?q=a%26b%20c');
  });
});
