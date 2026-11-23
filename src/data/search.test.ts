import { describe, expect, it } from 'vitest';
import { excerptRuns } from './search';

describe('excerptRuns', () => {
  it('splits highlights into matched and plain runs', () => {
    expect(excerptRuns('<mark>Dark</mark> <mark>Star</mark> Rough but nice')).toEqual([
      { text: 'Dark', match: true },
      { text: ' ', match: false },
      { text: 'Star', match: true },
      { text: ' Rough but nice', match: false },
    ]);
  });

  it('keeps markup out of the text and decodes entities', () => {
    expect(excerptRuns('<b onclick="x">AUD</b> &amp; <mark>SBD</mark><script>')).toEqual([
      { text: 'AUD & ', match: false },
      { text: 'SBD', match: true },
    ]);
  });

  it('is undefined for nothing to show', () => {
    expect(excerptRuns(undefined)).toBeUndefined();
    expect(excerptRuns('<br>')).toBeUndefined();
  });
});
