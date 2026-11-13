import cn from '@/lib/cn';

/**
 * The "Re" app icon (see lib/brandIcon.tsx), drawn in the page at a small size.
 * A 1px edge, the teal darkened, outlines it on either theme.
 */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        `
          inline-flex size-6 shrink-0 items-center justify-center rounded-[5px] bg-relisten-600
          pb-px text-[15px] leading-none font-bold tracking-[-0.25px] text-white
          shadow-[inset_0_0_0_1px_rgb(0_0_0/0.18)]
        `,
        className
      )}
    >
      Re
    </span>
  );
}
