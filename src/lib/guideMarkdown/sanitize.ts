import 'server-only';

import type { Definition, Nodes, PhrasingContent, Root, RootContent } from 'mdast';
import { markdownToMdast } from 'satteri';
import { lines, plainBlocks } from './plain';
import {
  BARE_TIMESTAMP,
  ENTRY_TIMESTAMP_LINK,
  OWN_TIMESTAMP_LINK,
  timestampSeconds,
} from './timestamps';
import type { GuideBlock, GuideContext, GuideInline, GuideSeek } from './types';

// The client half of keeping guide descriptions to the allowed subset
// (RelistenApi docs/design/2026-11-18-playlist-guide-content.md, "Accepting and
// sanitizing descriptions"). Parses CommonMark (satteri, no GFM), keeps
// paragraphs, bold, italics, lists, block quotes, `##`/`###` headings, `https:`
// links and timestamp links, and turns everything else into plain text. Images
// become their alt text and are never fetched. A single newline is a line break,
// since the mobile editor writes one for Return. Server-only: satteri is native
// (traced into the build by timber.config.ts), and stays out of the client bundle.

/** Deeper lists and quotes than this render as their source text. */
const MAX_DEPTH = 8;

export function sanitizeGuide(markdown: string, context: GuideContext): GuideBlock[] {
  let root: Root;
  try {
    root = markdownToMdast(markdown, { features: { gfm: false, frontmatter: false } });
  } catch {
    return plainBlocks(markdown);
  }
  return new Sanitizer(markdown, context, root).blocks(root.children, 0);
}

/**
 * An `https:` URL with no whitespace or control characters. Stricter than the
 * server on C1 controls (U+0080–U+009F), which the vectors allow a client to be.
 */
function isHttps(url: string): boolean {
  return (
    /^https:\/\//i.test(url) &&
    url.length > 'https://'.length &&
    // oxlint-disable-next-line no-control-regex -- matching control characters is the point
    !/[\s\u0000-\u001f\u007f-\u009f﻿]/.test(url)
  );
}

class Sanitizer {
  /** The first definition of each label wins, as in CommonMark. */
  private readonly definitions = new Map<string, Definition>();
  private readonly referenced = new Set<string>();

  constructor(
    private readonly source: string,
    private readonly context: GuideContext,
    root: Root
  ) {
    const visit = (node: Nodes) => {
      if (node.type === 'definition' && !this.definitions.has(node.identifier))
        this.definitions.set(node.identifier, node);
      if (node.type === 'linkReference' || node.type === 'imageReference')
        this.referenced.add(node.identifier);
      if ('children' in node) node.children.forEach(visit);
    };
    visit(root);
  }

  blocks(nodes: readonly RootContent[], depth: number): GuideBlock[] {
    return nodes.flatMap((node) => this.block(node, depth));
  }

  private block(node: RootContent, depth: number): GuideBlock[] {
    switch (node.type) {
      case 'paragraph':
        return this.paragraph(this.inlines(node.children, false));
      case 'heading':
        return node.depth === 2 || node.depth === 3
          ? [{ type: 'heading', depth: node.depth, children: this.inlines(node.children, false) }]
          : this.paragraph(this.inlines(node.children, false));
      case 'list':
        if (depth >= MAX_DEPTH) return this.sourceText(node);
        return [
          {
            type: 'list',
            ordered: !!node.ordered,
            ...(node.ordered && node.start != null && node.start !== 1 && { start: node.start }),
            items: node.children.map((item) => this.blocks(item.children, depth + 1)),
          },
        ];
      case 'blockquote':
        if (depth >= MAX_DEPTH) return this.sourceText(node);
        return [{ type: 'blockquote', children: this.blocks(node.children, depth + 1) }];
      case 'code':
      case 'html':
        return this.paragraph(this.text(node.value, false));
      case 'definition':
        // A definition a link uses renders as that link. One nothing uses is
        // prose that happens to look like one (`[Encore]: Brokedown`).
        return this.referenced.has(node.identifier) ? [] : this.sourceText(node);
      default:
        return this.sourceText(node);
    }
  }

  private paragraph(children: GuideInline[]): GuideBlock[] {
    return children.length ? [{ type: 'paragraph', children }] : [];
  }

  /** A node as the text it was written as. */
  private sourceText(node: RootContent): GuideBlock[] {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return [];
    return this.paragraph(this.text(this.source.slice(start, end), false));
  }

  private inlines(nodes: readonly PhrasingContent[], inLink: boolean): GuideInline[] {
    return nodes.flatMap((node) => this.inline(node, inLink));
  }

  private inline(node: PhrasingContent, inLink: boolean): GuideInline[] {
    switch (node.type) {
      case 'text':
      case 'inlineCode':
      case 'html':
        return this.text(node.value, inLink);
      case 'break':
        return [{ type: 'break' }];
      case 'strong':
      case 'emphasis':
        return [{ type: node.type, children: this.inlines(node.children, inLink) }];
      case 'link':
        return this.link(node.url, node.children, inLink);
      case 'linkReference': {
        const definition = this.definitions.get(node.identifier);
        return definition
          ? this.link(definition.url, node.children, inLink)
          : this.inlines(node.children, inLink);
      }
      case 'image':
      case 'imageReference':
        return this.text(node.alt ?? '', inLink);
      default:
        return 'children' in node ? this.inlines(node.children as PhrasingContent[], inLink) : [];
    }
  }

  /** A link to an allowed destination, else its label as text. Links don't nest. */
  private link(url: string, label: PhrasingContent[], inLink: boolean): GuideInline[] {
    const children = this.inlines(label, true);
    if (inLink) return children;
    if (isHttps(url)) return [{ type: 'link', href: url, children }];
    const seek = this.seekTarget(url);
    if (seek) return [{ type: 'seek', href: url, seek, children }];
    return this.inlines(label, false);
  }

  private seekTarget(url: string): GuideSeek | undefined {
    const entry = ENTRY_TIMESTAMP_LINK.exec(url);
    if (entry) return this.seek(entry[1], timestampSeconds(entry[2]));
    const own = OWN_TIMESTAMP_LINK.exec(url);
    // `#t=` names the description's own track, so it links only in a track's note.
    if (own && this.context.kind === 'track')
      return this.seek(this.context.entryId, timestampSeconds(own[1]));
    return undefined;
  }

  private seek(entryId: string, seconds: number): GuideSeek | undefined {
    const canSeek = this.context.canSeek ?? (() => true);
    return canSeek(entryId) ? { entryId, seconds } : undefined;
  }

  /**
   * Text, with newlines as breaks and, in a track's note, bare timestamps within
   * the track's length as links to them.
   */
  private text(value: string, inLink: boolean): GuideInline[] {
    const context = this.context;
    const duration = context.kind === 'track' ? context.durationSeconds : undefined;
    if (inLink || context.kind !== 'track' || !duration) return lines(value);
    const out: GuideInline[] = [];
    let last = 0;
    for (const match of value.matchAll(BARE_TIMESTAMP)) {
      const seconds = timestampSeconds(match[0]);
      const seek = seconds < duration ? this.seek(context.entryId, seconds) : undefined;
      if (!seek) continue;
      out.push(...lines(value.slice(last, match.index)));
      out.push({
        type: 'seek',
        href: `#t=${match[0]}`,
        seek,
        children: [{ type: 'text', value: match[0] }],
      });
      last = match.index + match[0].length;
    }
    out.push(...lines(value.slice(last)));
    return out;
  }
}
