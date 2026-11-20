// A sanitized guide description: only the subset the guide-content design allows
// (RelistenApi docs/design/2026-11-18-playlist-guide-content.md), as plain data.
// sanitize.ts builds it on the server; GuideProse renders it anywhere.

/** Where a description belongs, which decides what its timestamps can link to. */
export type GuideContext =
  /** A track entry's note: bare timestamps within its duration link to it. */
  | { kind: 'track'; entryId: string; durationSeconds?: number; canSeek?: CanSeek }
  /** A segment's description, a text block, or the playlist's description. */
  | { kind: 'segment' | 'text' | 'playlist'; canSeek?: CanSeek };

/** Whether a link may seek this entry (it's in the playlist and playable). Default: yes. */
export type CanSeek = (entryId: string) => boolean;

/** Start or seek an entry, `seconds` in. */
export type GuideSeek = { entryId: string; seconds: number };

export type GuideInline =
  | { type: 'text'; value: string }
  | { type: 'break' }
  | { type: 'strong' | 'emphasis'; children: GuideInline[] }
  /** An `https:` link. `href` is the destination as written. */
  | { type: 'link'; href: string; children: GuideInline[] }
  /** A `#t=` / `#entry=…&t=` link, or a bare timestamp in a track's note. */
  | { type: 'seek'; href: string; seek: GuideSeek; children: GuideInline[] };

export type GuideBlock =
  | { type: 'paragraph'; children: GuideInline[] }
  | { type: 'heading'; depth: 2 | 3; children: GuideInline[] }
  | { type: 'list'; ordered: boolean; start?: number; items: GuideBlock[][] }
  | { type: 'blockquote'; children: GuideBlock[] };
