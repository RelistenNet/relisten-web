import clsx, { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Register custom theme tokens so tailwind-merge doesn't treat e.g. `text-xxs`
// (font size) and `text-foreground-muted` (color) as conflicting.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['xxs'],
    },
  },
});

export default function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
