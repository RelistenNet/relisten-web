import type { GuideBlock, GuideInline } from './types';

// A description as plain text, in guide blocks: what the editor shows for prose
// it has changed and the server hasn't rendered yet, and the sanitizer's answer
// when parsing fails. Safe anywhere (no parser).

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
