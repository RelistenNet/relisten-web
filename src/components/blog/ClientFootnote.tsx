'use client';

import Tooltip from '@/components/Tooltip';
import React, { useRef, useState } from 'react';

export interface Props {
  content: React.ReactNode;
  children?: React.ReactNode;
  index: number;
}

const ClientFootnote = ({ index, content, children }: Props) => {
  const [open, setOpen] = useState(false);
  const sidenoteRef = useRef<HTMLSpanElement>(null);
  const body = content || children;

  const onClick = () => {
    // Taps never fire the kit's hover open, so open explicitly; blur closes it.
    setOpen(true);

    // Flash the sidenote (xl+) so the eye finds it. Restart the animation on repeat clicks.
    const el = sidenoteRef.current;
    if (!el) return;
    el.classList.remove('footnote-flash');
    void el.offsetWidth;
    el.classList.add('footnote-flash');
  };

  return (
    <span className="group/footnote inline">
      <Tooltip
        as="span"
        interactive
        open={open}
        onOpenChange={setOpen}
        triggerProps={{ tabIndex: 0, onClick }}
        contentClassName="tooltip-fade max-w-72 rounded-lg border-hairline bg-surface-raised p-2 text-foreground xl:hidden"
        content={body}
      >
        <sup
          className="
            footnote-index relative cursor-pointer text-xs
            after:absolute after:-inset-2 after:content-['']
          "
          id={`footnote-${index}`}
          // The sidenote anchors to this name. It lives on the <sup>, not the
          // tooltip trigger, because the kit owns the trigger's anchor-name.
          style={{ anchorName: `--fn-${index}` } as React.CSSProperties}
        >
          {index}
        </sup>
      </Tooltip>
      <span
        className="
            footnote-content hidden border-l-2 border-l-transparent py-0.5 pl-3 transition-colors
            group-hover/footnote:border-l-accent/60
            xl:flex
          "
        ref={sidenoteRef}
        style={
          {
            anchorName: `--fn-content-${index}`,
            top:
              index === 1
                ? `anchor(--fn-${index} top)`
                : `max(anchor(--fn-${index} top), calc(anchor(--fn-content-${index - 1} bottom) + 0.5rem))`,
          } as React.CSSProperties
        }
      >
        <sup className="footnote-index mt-0.5 text-xs">{index}</sup>
        &nbsp; <span className="text-left text-[13px]/relaxed text-foreground/80">{body}</span>
      </span>
    </span>
  );
};

export default ClientFootnote;
