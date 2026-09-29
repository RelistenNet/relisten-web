import React, { Ref } from 'react';
import cn from '../lib/cn';

interface Props {
  as?: React.ElementType;
  className?: string;
  center?: boolean;
  column?: boolean;
  children?: React.ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const Flex = ({
  className,
  center,
  column,
  as = 'div',
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & Props) => {
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
        },
        className
      )}
    />
  );
};

Flex.displayName = 'Flex';

export default Flex;
