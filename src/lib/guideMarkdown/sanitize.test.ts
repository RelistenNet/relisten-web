import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import vectorsFile from './__fixtures__/guide-markdown-vectors.json';
import { sanitizeGuide } from './sanitize';
import type { GuideBlock, GuideContext, GuideInline } from './types';

type Vector = {
  name: string;
  context: 'track' | 'segment' | 'text';
  durationSeconds?: number;
  markdown: string;
  links: string[];
  text: string[];
};

const ENTRY = 'playlist_entry_01k8000000e008000000000001';

function inlineText(nodes: GuideInline[]): string {
  return nodes
    .map((n) => (n.type === 'text' ? n.value : n.type === 'break' ? '\n' : inlineText(n.children)))
    .join('');
}

function blockText(blocks: GuideBlock[]): string {
  return blocks
    .map((b) =>
      b.type === 'list'
        ? b.items.map(blockText).join('\n')
        : b.type === 'blockquote'
          ? blockText(b.children)
          : inlineText(b.children)
    )
    .join('\n');
}

function links(blocks: GuideBlock[]): string[] {
  const out: string[] = [];
  const inline = (n: GuideInline) => {
    if (n.type === 'link' || n.type === 'seek') out.push(n.href);
    if ('children' in n) n.children.forEach(inline);
  };
  const block = (b: GuideBlock) => {
    if (b.type === 'list') b.items.forEach((item) => item.forEach(block));
    else if (b.type === 'blockquote') b.children.forEach(block);
    else b.children.forEach(inline);
  };
  blocks.forEach(block);
  return out;
}

const contextFor = (v: Vector): GuideContext =>
  v.context === 'track'
    ? { kind: 'track', entryId: ENTRY, durationSeconds: v.durationSeconds }
    : { kind: v.context };

describe('guide markdown vectors', () => {
  const vectors = (vectorsFile as { vectors: Vector[] }).vectors;

  it.each(vectors.map((v) => [v.name, v] as const))('%s', (_, v) => {
    const blocks = sanitizeGuide(v.markdown, contextFor(v));
    // Exactly the allowed links, and every expected run of text.
    expect(links(blocks)).toEqual(v.links);
    const text = blockText(blocks);
    for (const s of v.text) expect(text).toContain(s);
    // Nothing but the subset's node types (no image, no HTML).
    expect(JSON.stringify(blocks)).not.toMatch(/"type":"(image|html|definition)/);
  });

  it('matches the User Service copy, when the API repo is beside this one', () => {
    const upstream = resolve(
      import.meta.dirname,
      '../../../../RelistenApi/RelistenUserServiceTests/Fixtures/playlists/guide-markdown-vectors.json'
    );
    if (!existsSync(upstream)) return;
    expect(JSON.parse(readFileSync(upstream, 'utf8'))).toEqual(vectorsFile);
  });
});

describe('sanitizeGuide', () => {
  it('keeps the subset as structure', () => {
    expect(
      sanitizeGuide('## Set two\n\n1. *Dark Star*\n2. **St. Stephen**', { kind: 'segment' })
    ).toEqual([
      { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Set two' }] },
      {
        type: 'list',
        ordered: true,
        items: [
          [
            {
              type: 'paragraph',
              children: [{ type: 'emphasis', children: [{ type: 'text', value: 'Dark Star' }] }],
            },
          ],
          [
            {
              type: 'paragraph',
              children: [{ type: 'strong', children: [{ type: 'text', value: 'St. Stephen' }] }],
            },
          ],
        ],
      },
    ]);
  });

  it('turns a single newline into a line break', () => {
    expect(sanitizeGuide('One\nTwo', { kind: 'text' })).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'One' },
          { type: 'break' },
          { type: 'text', value: 'Two' },
        ],
      },
    ]);
  });

  it('seeks the right entry, and only playable ones', () => {
    const other = 'playlist_entry_01k8000000e008000000000004';
    const md = `[here](#entry=${other}&t=1:02:03) and 0:30`;
    const track: GuideContext = { kind: 'track', entryId: ENTRY, durationSeconds: 60 };
    const [p] = sanitizeGuide(md, track);
    expect(p.type === 'paragraph' && p.children.filter((n) => n.type === 'seek')).toEqual([
      expect.objectContaining({ seek: { entryId: other, seconds: 3723 } }),
      expect.objectContaining({ seek: { entryId: ENTRY, seconds: 30 } }),
    ]);
    // An unplayable target renders its label as text.
    expect(links(sanitizeGuide(md, { ...track, canSeek: (id) => id === ENTRY }))).toEqual([
      '#t=0:30',
    ]);
  });

  it('leaves bare timestamps alone until the track has a length', () => {
    expect(links(sanitizeGuide('At 2:00', { kind: 'track', entryId: ENTRY }))).toEqual([]);
  });

  it('shows unused definitions with non-ASCII text before them as written', () => {
    expect(blockText(sanitizeGuide('Café 🎸\n\n[Encore]: Brokedown', { kind: 'segment' }))).toBe(
      'Café 🎸\n[Encore]: Brokedown'
    );
  });

  it('flattens nesting past its limit into text', () => {
    const deep = '>'.repeat(40) + ' deep';
    expect(blockText(sanitizeGuide(deep, { kind: 'segment' }))).toContain('deep');
  });
});
