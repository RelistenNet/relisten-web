import { ReactNode } from 'react';

/**
 * One column of the browse grid. Each browse layout renders its own column
 * followed by `children`, and the leaf page fills the columns to its right, so
 * the grid always has the same columns as flat siblings (globals.css targets
 * `.browse-grid > .browse-col`).
 */
export default function BrowseColumn({ children }: { children?: ReactNode }) {
  return <div className="browse-col">{children}</div>;
}
