'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchResultsType } from '@/types';
import Column from '../Column';
import Row from '../Row';

export default function SortByMenu({ resultsType }: { resultsType: SearchResultsType }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const writableParams = new URLSearchParams(searchParams);

  function handleClick(value) {
    writableParams.set('sortBy', value);
    router.replace(`${pathname}?${writableParams.toString()}`);
  }

  if (resultsType !== 'versions') {
    return null;
  }

  return (
    <Column>
      <button className="px-2" onClick={() => handleClick('DATE_ASC')}>
        <Row>Date (Ascending)</Row>
      </button>
      <button className="px-2" onClick={() => handleClick('DATE_DESC')}>
        <Row>Date (Descending)</Row>
      </button>
    </Column>
  );
}
