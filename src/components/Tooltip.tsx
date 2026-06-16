'use client';

import cn from '@/lib/cn';
import { ReactNode, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; right: number } | null>(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, right: window.innerWidth - r.right });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <div
      ref={triggerRef}
      className={className ?? ''}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {pos &&
        createPortal(
          <div
            className={cn(
              contentClassName,
              `
                pointer-events-none fixed z-50 rounded-sm
                border border-foreground-muted/20 bg-background p-2 shadow-lg
                animate-in fade-in duration-150
              `
            )}
            style={{
              top: pos.top,
              ...(align === 'right' ? { right: pos.right } : { left: pos.left }),
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
