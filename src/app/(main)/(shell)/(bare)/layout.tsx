import { PropsWithChildren } from 'react';

// Under the nav ((main)/layout.tsx): the embed test pages, full width.
export default function BareLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex-1 px-4 lg:overflow-y-auto">
      <div className="mx-auto w-full py-8">{children}</div>
    </div>
  );
}
