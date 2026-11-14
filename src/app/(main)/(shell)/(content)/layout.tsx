import { ReactNode } from 'react';

// Under the nav ((main)/layout.tsx): the content pages' scrolling column,
// sized by the page's marker class.
export default function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 px-4 pt-2 lg:overflow-y-auto">
      <div
        className="
          mx-auto my-8 max-w-2xl has-[.blog-post]:max-w-xl has-[.detail-page]:my-6
          has-[.detail-page]:max-w-5xl has-[.live-page]:max-w-5xl
        "
      >
        {children}
      </div>
    </div>
  );
}
