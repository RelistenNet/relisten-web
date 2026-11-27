import { Fragment, type ReactNode } from 'react';
import cn from '@/lib/cn';
import type { GuideBlock, GuideInline, GuideSeek } from './types';

// Renders a sanitized guide description (sanitize.ts) as React elements: no HTML
// strings, so nothing outside the subset can reach the page. No hooks, so it
// renders on the server; timestamp links are the caller's (they need the player).

export type RenderSeek = (seek: GuideSeek, label: ReactNode, href: string) => ReactNode;

export default function GuideProse({
  blocks,
  renderSeek,
  className,
}: {
  blocks: GuideBlock[];
  /** A timestamp link. Without one, its label renders as text. */
  renderSeek?: RenderSeek;
  className?: string;
}) {
  if (!blocks.length) return null;
  return (
    // Blocks are spaced by the gap above each one, so the first sits flush.
    <div className={cn('[&>*+*]:mt-2', className)}>{renderBlocks(blocks, renderSeek)}</div>
  );
}

function renderBlocks(blocks: GuideBlock[], renderSeek?: RenderSeek): ReactNode[] {
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <p key={i} className="mb-0">
            {renderInlines(block.children, renderSeek)}
          </p>
        );
      case 'heading': {
        const Heading = block.depth === 2 ? 'h2' : 'h3';
        return (
          <Heading
            key={i}
            className={cn(
              'mb-0 font-semibold text-text-primary',
              block.depth === 2 ? 'text-base' : 'text-[15px]'
            )}
          >
            {renderInlines(block.children, renderSeek)}
          </Heading>
        );
      }
      case 'list': {
        const List = block.ordered ? 'ol' : 'ul';
        return (
          <List
            key={i}
            start={block.start}
            // ml-0: the global `li` rule indents list items.
            className={cn(
              'm-0 pl-5 [&>li]:ml-0 [&>li+li]:mt-0.5',
              block.ordered ? 'list-decimal' : 'list-disc'
            )}
          >
            {block.items.map((item, j) => (
              <li key={j} className="[&>*+*]:mt-1">
                {renderBlocks(item, renderSeek)}
              </li>
            ))}
          </List>
        );
      }
      case 'blockquote':
        return (
          <blockquote
            key={i}
            className="m-0 border-l-2 border-text-primary/15 pl-3 text-text-secondary [&>*+*]:mt-2"
          >
            {renderBlocks(block.children, renderSeek)}
          </blockquote>
        );
    }
  });
}

function renderInlines(nodes: GuideInline[], renderSeek?: RenderSeek): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return node.value;
      case 'break':
        return <br key={i} />;
      case 'strong':
        return (
          <strong key={i} className="font-semibold">
            {renderInlines(node.children, renderSeek)}
          </strong>
        );
      case 'emphasis':
        return <em key={i}>{renderInlines(node.children, renderSeek)}</em>;
      // No links off Relisten: the subset allows them (and the app and API keep
      // them), but the web shows only their label.
      case 'link':
        return <Fragment key={i}>{renderInlines(node.children, renderSeek)}</Fragment>;
      case 'seek': {
        const label = renderInlines(node.children, renderSeek);
        return (
          <Fragment key={i}>
            {renderSeek ? renderSeek(node.seek, label, node.href) : label}
          </Fragment>
        );
      }
    }
  });
}
