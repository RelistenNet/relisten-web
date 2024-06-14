import { SearchParams, SearchResultsType } from '@/types';
import Link from 'next/link';
import Column from '../Column';
import Row from '../Row';

export default function SortByMenu({
  resultsType,
  searchParams,
}: {
  resultsType: SearchResultsType;
  searchParams: SearchParams;
}) {
  const writableParams = new URLSearchParams(searchParams);

  function getHref(sortBy) {
    writableParams.set('sortBy', sortBy);
    return `search?${writableParams.toString()}`;
  }

  if (resultsType !== 'versions') {
    return null;
  }

  return (
    <Column>
      <Link replace={true} className="px-2" href={getHref('DATE_ASC')}>
        <Row>Date (Ascending)</Row>
      </Link>
      <Link replace={true} className="px-2" href={getHref('DATE_DESC')}>
        <Row>Date (Descending)</Row>
      </Link>
    </Column>
  );
}
