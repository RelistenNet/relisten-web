'use client';

import { useEffect, useState } from 'react';

export type TodayTOCItem = {
  name: string;
  anchor: string;
  count: number;
};

const TodayTOC = ({ items }: { items: TodayTOCItem[] }) => {
  const [activeAnchor, setActiveAnchor] = useState<string | undefined>(items[0]?.anchor);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setActiveAnchor(visible[0].target.id);
        }
      },
      { rootMargin: '-64px 0px -70% 0px', threshold: 0 }
    );

    items.forEach(({ anchor }) => {
      const el = document.getElementById(anchor);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-4 hidden w-48 shrink-0 self-start md:block">
      <p className="mb-2 text-sm font-semibold uppercase text-white">Artists</p>
      <ul className="max-h-[calc(100vh-2rem)] list-none space-y-1 overflow-y-auto pr-2 text-sm">
        {items.map(({ name, anchor, count }) => {
          const isActive = anchor === activeAnchor;
          return (
            <li key={anchor} className="ml-0 list-none">
              <a
                href={`#${anchor}`}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 transition-colors ${
                  isActive
                    ? 'bg-surface-hover font-medium text-text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <span className="truncate">{name}</span>
                <span className="text-xxs text-text-muted">{count}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default TodayTOC;
