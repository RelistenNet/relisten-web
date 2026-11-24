import { describe, expect, it } from 'vitest';
import { decodeEntities } from './htmlEntities';

describe('decodeEntities', () => {
  it('decodes named entities', () => {
    expect(decodeEntities("'80s &amp; '90s, 0:11&gt;3:36 &quot;hi&quot;")).toBe(
      `'80s & '90s, 0:11>3:36 "hi"`
    );
  });

  it('decodes decimal and hex entities', () => {
    expect(decodeEntities('it&#39;s &#x2019; &#8212;')).toBe("it's ’ —");
  });

  it('decodes once', () => {
    expect(decodeEntities('&amp;gt;')).toBe('&gt;');
  });

  it('leaves unknown and invalid entities alone', () => {
    expect(decodeEntities('&bogus; &#0; &#x110000; a & b')).toBe('&bogus; &#0; &#x110000; a & b');
  });
});
