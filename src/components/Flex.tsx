import React from 'react';
import cn from '../lib/cn';

interface Props {
  as?: React.ElementType;
  className?: string;
  center?: boolean;
  column?: boolean;
  children?: React.ReactNode;
  gap?: number;
}

const Flex = React.forwardRef(
  (
    {
      className,
      center,
      column,
      gap,
      as = 'div',
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Props,
    ref
  ) => {
    const Comp = as;

    return (
      <Comp
        {...props}
        ref={ref}
        className={cn(
          'flex',
          {
            'flex-col': column,
            'justify-center': center,
            'items-center': center,
            [`gap-${gap}`]: gap,
          },
          className
        )}
      />
    );
  }
);

Flex.displayName = 'Flex';

export default Flex;
