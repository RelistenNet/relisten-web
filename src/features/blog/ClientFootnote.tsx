'use client';

import { Popover, PopoverContent, PopoverTrigger } from 'css-anchor-kit';
import React, { useRef } from 'react';

export interface Props {
  content: React.ReactNode;
  children?: React.ReactNode;
  index: number;
}

const ClientFootnote = ({ index, content, children }: Props) => {
  const sidenoteRef = useRef<HTMLSpanElement>(null);
  const body = content || children;

  // Flash the sidenote (xl+) so the eye finds it. Restart the animation on repeat clicks.
  const flash = () => {
    const el = sidenoteRef.current;
    if (!el) return;
    el.classList.remove('footnote-flash');
    void el.offsetWidth;
    el.classList.add('footnote-flash');
  };

  return (
    <span className="group/footnote inline">
      {/* Below xl: a native `popover="auto"` — tap/click opens, outside tap and Esc close. */}
      <Popover placement="bottom" offset={4} flip>
        <PopoverTrigger as="button" onClick={flash} className="cursor-pointer">
          <sup
            className="
              footnote-index relative text-xs
              after:absolute after:-inset-2 after:content-['']
            "
            id={`footnote-${index}`}
            // The sidenote anchors to this name. It lives on the <sup>, not the
            // trigger, because the kit owns the trigger's anchor-name.
            style={{ anchorName: `--fn-${index}` } as React.CSSProperties}
          >
            {index}
          </sup>
        </PopoverTrigger>
        <PopoverContent
          as="span"
          data-side="bottom"
          data-align="center"
          className="
            anchored-safe tooltip-fade max-w-72 rounded-lg border border-hairline bg-surface-raised
            p-2 text-sm text-foreground shadow-lg
            xl:hidden
          "
        >
          {body}
        </PopoverContent>
      </Popover>
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
