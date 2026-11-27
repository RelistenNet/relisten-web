import type { GuideBlock, GuideInline } from './types';

// A description as plain text, in guide blocks: what the editor shows for prose
// it has changed and the server hasn't rendered yet, and the sanitizer's answer
// when parsing fails. And back: sanitized blocks as one line of text, for a
// listing's preview. Safe anywhere (no parser).

/** Text with each newline as a line break. */
export function lines(value: string): GuideInline[] {
  return value
    .split('\n')
    .flatMap((line, i): GuideInline[] => [
      ...(i > 0 ? [{ type: 'break' } as const] : []),
      ...(line ? [{ type: 'text', value: line } as const] : []),
    ]);
}

/** A paragraph per blank-line-separated run. */
export function plainBlocks(text: string): GuideBlock[] {
  return text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => ({ type: 'paragraph', children: lines(p) }));
}

/** Sanitized blocks as one line: their words, with every block and line break a space. */
export function oneLine(blocks: GuideBlock[]): string {
  const inline = (nodes: GuideInline[]): string =>
    nodes
      .map((n) => (n.type === 'text' ? n.value : n.type === 'break' ? ' ' : inline(n.children)))
      .join('');
  const block = (b: GuideBlock): string =>
    b.type === 'list'
      ? b.items.map((item) => item.map(block).join(' ')).join(' ')
      : b.type === 'blockquote'
        ? b.children.map(block).join(' ')
        : inline(b.children);
  return blocks.map(block).join(' ').replace(/\s+/g, ' ').trim();
}
