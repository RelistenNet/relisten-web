'use client';

import cn from '@/lib/cn';
import {
  type PointerEvent,
  type ReactNode,
  type SyntheticEvent,
  createContext,
  useContext,
  useState,
} from 'react';
import { Tooltip as AnchorTooltip, TooltipTrigger, TooltipContent } from 'css-anchor-kit';

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  contentClassName?: string;
  align?: 'left' | 'right' | 'top' | 'bottom';
};

const placementMap = {
  top: 'top',
  bottom: 'bottom',
  left: 'bottom-start',
  right: 'bottom-end',
} as const;

export const TooltipThemeContext = createContext<'light' | 'dark' | 'auto'>('auto');

export default function Tooltip({
  children,
  content,
  contentClassName,
  className,
  align = 'bottom',
}: TooltipProps) {
  const theme = useContext(TooltipThemeContext);
  const placement = placementMap[align];
  const [side, alignment = 'center'] = placement.split('-');

  // Mount the popover only once the tooltip is first about to open. Long lists
  // put a tooltip on every row, and server-rendering each hidden popover (its
  // body, classes and inline anchor styles) was a large share of those pages'
  // HTML and SSR time.
  //
  // The library can't open a popover that isn't mounted: its open request
  // would mark it open with no element to show, and the content mounting
  // afterwards would think it was already shown. So the first pointerenter /
  // focus is ours alone: preventDefault() makes the library skip its own
  // handler (it chains after ours and checks `defaultPrevented`), and we mount
  // the content already `open`, which makes the content call showPopover() as
  // it mounts. From then on the library drives open state through
  // onOpenChange as usual.
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);
  const arm = (e: SyntheticEvent) => {
    if (armed) return;
    if (e.type === 'pointerenter' && (e as PointerEvent<HTMLElement>).pointerType === 'touch') {
      return; // The library doesn't open tooltips on touch either.
    }
    e.preventDefault();
    setArmed(true);
    setOpen(true);
  };

  return (
    <AnchorTooltip
      placement={placement}
      offset={4}
      flip
      openDelay={0}
      closeDelay={0}
      open={open}
      onOpenChange={setOpen}
    >
      <TooltipTrigger as="div" className={className ?? ''} onPointerEnter={arm} onFocus={arm}>
        {children}
      </TooltipTrigger>
      {armed && (
        <TooltipContent
          // `anchored-safe` keeps the tooltip clear of the notch / home indicator.
          data-side={side}
          data-align={alignment}
          className={cn(
            contentClassName,
            // Non-interactive: the tooltip often overlaps the next row's trigger, and
            // if it caught the pointer, hovering that trigger would never open its tooltip.
            'anchored-safe pointer-events-none rounded-sm border p-2 text-sm shadow-lg',
            theme === 'light'
              ? 'border-gray-200 bg-white text-gray-900'
              : 'border-foreground-muted/20 bg-surface-raised text-text-primary'
          )}
        >
          {content}
        </TooltipContent>
      )}
    </AnchorTooltip>
  );
}
