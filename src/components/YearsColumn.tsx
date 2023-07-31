'use client';

import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import ky from 'ky';
import { usePathname } from 'next/navigation';
import { API_DOMAIN } from '../lib/constants';
import { Year } from '../types';
import Column from './Column';
import Row from './Row';

const fetchYears = async (slug?: string) => {
  if (!slug) return [];

  const parsed = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years`).json();

  return parsed;
};

const YearsColumn = () => {
  const pathname = usePathname();
  const [artistSlug, currentYear] = pathname ? pathname.split('/').filter((x) => x) : [];

  const artists = useQuery({
    queryKey: ['artists'],
  });
  const artistYears: any = useSuspenseQuery({
    queryKey: ['artists', artistSlug],
    queryFn: () => fetchYears(artistSlug!),
    // enabled: !!artistSlug,
  });

  return (
    <Column
      heading={artistYears && artists.data?.[artistSlug] ? artists.data[artistSlug].name : 'Years'}
      loading={artistYears && artistYears.meta && artistYears.meta.loading}
      loadingAmount={12}
    >
      {artistYears?.data &&
        sortActiveBands(artistSlug, artistYears.data).map((year: Year) => (
          <Row
            key={year.id}
            href={`/${artistSlug}/${year.year}`}
            active={year.year === currentYear}
          >
            <div className={year.year === currentYear ? 'pl-2' : ''}>
              <div>{year.year}</div>
            </div>
            <div className="min-w-[20%] text-right text-[0.7em] text-[#979797]">
              <div>{simplePluralize('show', year.show_count)}</div>
              <div>{simplePluralize('tape', year.source_count)}</div>
            </div>
          </Row>
        ))}
    </Column>
  );
};

export default YearsColumn;
