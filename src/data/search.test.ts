import { describe, expect, it } from 'vitest';
import { excerptRuns, performanceHref } from './search';

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

describe('performanceHref', () => {
  it('links to the track on the recording the preview comes from', () => {
    expect(
      performanceHref('phish', '2013-07-31', { slug: 'tweezer-27717', source_id: 'source_abc' })
    ).toBe('/phish/2013/07/31/tweezer-27717?source=abc');
  });

  it('links to the show on that recording when the preview has no slug', () => {
    expect(performanceHref('phish', '2013-07-31', { source_id: 'source_abc' })).toBe(
      '/phish/2013/07/31?source=abc'
    );
  });
});
