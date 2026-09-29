'use client';

import cn from '@/lib/cn';
import { ReactNode, createContext, useContext } from 'react';
import {
  Tooltip as AnchorTooltip,
  TooltipTrigger,
  TooltipContent,
  SafeArea,
} from 'css-anchor-kit';

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

  return (
    <AnchorTooltip
      placement={placementMap[align]}
      offset={4}
      flip
      safeArea
      openDelay={0}
      closeDelay={0}
    >
      <TooltipTrigger as="div" className={className ?? ''}>
        {children}
      </TooltipTrigger>
      <TooltipContent
        className={cn(
          contentClassName,
          'rounded-sm border p-2 text-sm shadow-lg',
          theme === 'light'
            ? 'border-gray-200 bg-white text-gray-900'
            : 'border-foreground-muted/20 bg-surface-raised text-text-primary'
        )}
      >
        <SafeArea />
        {content}
      </TooltipContent>
    </AnchorTooltip>
  );
}
