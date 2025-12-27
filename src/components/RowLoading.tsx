import type { JSX } from 'react';
const RowLoading = (): JSX.Element => (
  <div className="content h-full animate-pulse">
    <div className="w-1/2">
      <div className="h-[1em] w-full bg-skeleton" />
    </div>
    <div className="w-2/12">
      <div className="h-[0.7em] w-full bg-skeleton" />
      <div className="h-[0.7em] w-full bg-skeleton" />
    </div>
  </div>
);

export default RowLoading;
