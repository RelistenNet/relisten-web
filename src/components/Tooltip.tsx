import cn from '@/lib/cn';
import { ReactNode } from 'react';

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  contentClassName?: string;
  align?: 'left' | 'right';
};

export default function Tooltip({
  children,
  content,
  contentClassName,
  className,
  align = 'left',
}: TooltipProps) {
  return (
    <div className={`group/tooltip relative ${className ?? ''}`}>
      {children}
      <div
        className={cn(
          contentClassName,
          `bg-background border-foreground-muted/20 pointer-events-none absolute top-full z-50 mt-1 -translate-y-1 scale-95 rounded border p-2 opacity-0 shadow-lg transition-all duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 ${align === 'right' ? 'right-0' : 'left-0'}`
        )}
      >
        {content}
      </div>
    </div>
  );
}
