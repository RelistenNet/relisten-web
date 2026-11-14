'use client';

import * as React from 'react';
import {
  Arrow,
  Popover as AnchoredPopover,
  PopoverContent as AnchoredPopoverContent,
  PopoverTrigger as AnchoredPopoverTrigger,
  type Placement,
} from 'css-anchor-kit';

import cn from '@/lib/cn';

// A click-to-open popover: a native `popover="auto"` panel in the top layer,
// placed with CSS anchor positioning (css-anchor-kit, like <Tooltip>). The
// browser handles light dismiss and Escape. No transforms position it, so
// anchored tooltips inside it land in the right place in every browser.

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'center' | 'end';

const OpenContext = React.createContext(false);

function Popover({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: Side;
  align?: Align;
  /** Gap between the trigger and the panel, in px. */
  sideOffset?: number;
  children?: React.ReactNode;
}) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const placement: Placement = align === 'center' ? side : `${side}-${align}`;

  return (
    <AnchoredPopover
      open={open}
      onOpenChange={(next) => {
        if (openProp === undefined) setOpenState(next);
        onOpenChange?.(next);
      }}
      placement={placement}
      offset={sideOffset}
    >
      <OpenContext.Provider value={open}>{children}</OpenContext.Provider>
    </AnchoredPopover>
  );
}

/** The button that opens the popover. `aria-expanded` says whether it's open. */
function PopoverTrigger(props: React.ComponentProps<'button'>) {
  return <AnchoredPopoverTrigger data-slot="popover-trigger" {...props} />;
}

/**
 * The panel. Its children mount when it opens and unmount when it closes, so
 * `autoFocus` and on-open effects inside it run each time it opens.
 */
function PopoverContent({
  className,
  arrowClassName,
  children,
  ...props
}: React.ComponentProps<'div'> & { arrowClassName?: string }) {
  const open = React.useContext(OpenContext);
  return (
    <AnchoredPopoverContent
      data-slot="popover-content"
      className={cn(
        `
          z-50 flex w-72 flex-col gap-2.5 overflow-visible rounded-lg bg-surface-raised p-2.5
          text-sm text-text-primary shadow-lg ring-1 ring-hairline outline-hidden
          transition-[opacity,display,overlay] transition-discrete duration-100
          not-open:opacity-0 starting:open:opacity-0
        `,
        className
      )}
      {...props}
    >
      <Arrow
        data-slot="popover-arrow"
        className={cn(
          'size-3 rotate-45 rounded-tl-sm border-t border-l border-hairline bg-surface-raised',
          arrowClassName
        )}
      />
      {open && children}
    </AnchoredPopoverContent>
  );
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="popover-header"
      className={cn('flex flex-col gap-0.5 text-sm', className)}
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="popover-title" className={cn('font-medium', className)} {...props} />;
}

function PopoverDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p data-slot="popover-description" className={cn('text-text-muted', className)} {...props} />
  );
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
