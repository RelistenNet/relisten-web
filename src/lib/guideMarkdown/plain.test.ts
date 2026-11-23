import { describe, expect, it } from 'vitest';
import { oneLine } from './plain';
import { sanitizeGuide } from './sanitize';

describe('oneLine', () => {
  it('keeps the words of every block, one space apart', () => {
    const blocks = sanitizeGuide(
      '## Why\n\nThe **best** [jams](https://example.com),\nin order.\n\n- one\n- two\n\n> quoted',
      { kind: 'playlist' }
    );
    expect(oneLine(blocks)).toBe('Why The best jams, in order. one two quoted');
  });
});
