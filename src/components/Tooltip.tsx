'use client';

import cn from '@/lib/cn';
import { ReactNode, createContext, useContext } from 'react';
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

  return (
    <AnchorTooltip placement={placement} offset={4} flip openDelay={0} closeDelay={0}>
      <TooltipTrigger as="div" className={className ?? ''}>
        {children}
      </TooltipTrigger>
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
    </AnchorTooltip>
  );
}
