import { describe, expect, it } from 'vitest';
import { pageSlots } from './Pagination';

describe('pageSlots', () => {
  it('lists every page when there are few', () => {
    expect(pageSlots(1, 1)).toEqual([1]);
    expect(pageSlots(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('always has seven slots past seven pages, so the bar never resizes', () => {
    for (let page = 1; page <= 40; page++) expect(pageSlots(page, 40)).toHaveLength(7);
  });

  it('keeps the first and last pages and the current page with its neighbors', () => {
    expect(pageSlots(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
    expect(pageSlots(4, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
    expect(pageSlots(5, 20)).toEqual([1, 'gap', 4, 5, 6, 'gap', 20]);
    expect(pageSlots(16, 20)).toEqual([1, 'gap', 15, 16, 17, 'gap', 20]);
    expect(pageSlots(17, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20]);
    expect(pageSlots(20, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20]);
  });
});
