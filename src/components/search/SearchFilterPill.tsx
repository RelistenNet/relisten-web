import Link from 'next/link';
import { SearchParams, SearchResultsType } from '@/types';
import React from 'react';

export default function SearchFilterPill({
  buttonType,
  children,
  resultsType,
  searchParams,
}: {
  buttonType: SearchResultsType;
  children: React.ReactNode;
  resultsType: SearchResultsType;
  searchParams: SearchParams;
}) {
  const writableParams = new URLSearchParams(searchParams);

  writableParams.set('resultsType', buttonType);

  return (
    <Link
      className={`mr-1 mt-1 inline-block rounded-full px-2 py-1 ${resultsType === buttonType ? 'search-filters-item--active' : ''}`}
      href={`search?${writableParams.toString()}`}
      replace={true}
    >
      {children}
    </Link>
  );
}
