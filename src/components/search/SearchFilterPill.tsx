'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchResultsType } from '@/types';
import React from 'react';

export default function SearchFilterPill({
  buttonType,
  children,
  resultsType,
}: {
  buttonType: SearchResultsType;
  children: React.ReactNode;
  resultsType: SearchResultsType;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const writableParams = new URLSearchParams(searchParams);

  function handleClick() {
    writableParams.set('resultsType', buttonType);
    router.replace(`${pathname}?${writableParams.toString()}`);
  }

  return (
    <button
      className={resultsType === buttonType ? 'search-filters-button--active' : ''}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
