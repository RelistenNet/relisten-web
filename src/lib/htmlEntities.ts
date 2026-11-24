// Upstream text (reviews, search highlights) arrives HTML-escaped. React
// renders it as text, so the entities have to be decoded first.

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

const ENTITY = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi;

const fromCodePoint = (n: number, raw: string) =>
  Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : raw;

/**
 * Decodes HTML entities in one pass, so "&amp;gt;" becomes "&gt;", not ">".
 * Unknown entities are left as written.
 */
export function decodeEntities(text: string): string {
  return text.replace(ENTITY, (raw, dec?: string, hex?: string, name?: string) => {
    if (dec) return fromCodePoint(Number.parseInt(dec, 10), raw);
    if (hex) return fromCodePoint(Number.parseInt(hex, 16), raw);
    return (name && NAMED[name.toLowerCase()]) || raw;
  });
}
