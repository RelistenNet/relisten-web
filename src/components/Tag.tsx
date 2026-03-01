import React, { type JSX } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import cn from '@/lib/cn';

const tagVariants = cva(
  'ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-emerald-500 text-white',
        success: 'bg-emerald-100 text-emerald-700',
        warning: 'bg-amber-100 text-amber-700',
        info: 'bg-relisten-100 text-relisten-800',
        error: 'bg-red-100 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TagProps = VariantProps<typeof tagVariants> & {
  children: React.ReactNode;
  className?: string;
};

const Tag = ({ children, variant, className }: TagProps): JSX.Element => (
  <span className={cn(tagVariants({ variant }), className)}>{children}</span>
);

export default Tag;
