'use client';

import cn from '@/lib/cn';
import { ElementType, HTMLAttributes, ReactNode, createContext, useContext } from 'react';
import { Tooltip as AnchorTooltip, TooltipTrigger, TooltipContent, SafeArea } from 'css-anchor-kit';

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  contentClassName?: string;
  align?: 'left' | 'right' | 'top' | 'bottom';
  /** Element the trigger renders as. Use an inline tag (`span`) inside running text. */
  as?: ElementType;
  /** Extra props for the trigger element (tabIndex, onClick, id, …). */
  triggerProps?: HTMLAttributes<HTMLElement>;
  /**
   * Let the pointer move into the tooltip (so links in it are clickable).
   * Off by default: a tooltip often overlaps the next row's trigger, and if it
   * caught the pointer, hovering that trigger would never open its tooltip.
   */
  interactive?: boolean;
  /** Controlled open state (e.g. to open on tap, which the kit ignores). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  as = 'div',
  triggerProps,
  interactive = false,
  open,
  onOpenChange,
}: TooltipProps) {
  const theme = useContext(TooltipThemeContext);
  const placement = placementMap[align];
  const [side, alignment = 'center'] = placement.split('-');
  // An inline trigger sits in running text (often a <p>), so the popup must be
  // phrasing content too. It's fixed-position in the top layer either way, so
  // the tag doesn't change how it lays out.
  const contentAs = as === 'div' ? 'div' : 'span';

  return (
    <AnchorTooltip
      placement={placement}
      offset={4}
      flip
      safeArea={interactive}
      openDelay={0}
      closeDelay={interactive ? 100 : 0}
      {...(open !== undefined ? { open, onOpenChange } : {})}
    >
      <TooltipTrigger as={as} className={className ?? ''} {...triggerProps}>
        {children}
      </TooltipTrigger>
      <TooltipContent
        as={contentAs}
        // `anchored-safe` keeps the margin box (which flip/anchor-center test
        // against the viewport) clear of the notch and home indicator.
        data-side={side}
        data-align={alignment}
        className={cn(
          'anchored-safe rounded-sm border p-2 text-sm shadow-lg',
          !interactive && 'pointer-events-none',
          theme === 'light'
            ? 'border-gray-200 bg-white text-gray-900'
            : 'border-foreground-muted/20 bg-surface-raised text-text-primary',
          contentClassName
        )}
      >
        {interactive && <SafeArea as={contentAs} />}
        {content}
      </TooltipContent>
    </AnchorTooltip>
  );
}
