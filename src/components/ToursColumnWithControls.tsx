'use client';

import { useMemo, useState } from 'react';
import { Tour } from '@/types';
import { simplePluralize } from '@/lib/utils';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';

type ToursColumnWithControlsProps = {
  artistSlug?: string;
  tours: Tour[];
};

const formatTourDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
};

const ToursColumnWithControls = ({ artistSlug, tours }: ToursColumnWithControlsProps) => {
  const [sortOldest, setSortOldest] = useState(false);

  const toggles = [
    {
      type: 'sort' as const,
      isActive: sortOldest,
      onToggle: () => setSortOldest((v) => !v),
      title: sortOldest ? 'Newest' : 'Oldest',
    },
  ];

  const sortedTours = useMemo(() => {
    const sorted = [...tours];
    sorted.sort((a, b) => {
      const dateA = a.start_date || '';
      const dateB = b.start_date || '';
      return sortOldest ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });
    return sorted;
  }, [tours, sortOldest]);

  return (
    <ColumnWithToggleControls
      heading="Tours"
      toggles={toggles}
      filteredCount={sortedTours.length}
      totalCount={tours.length}
    >
      {sortedTours.length === 0 && (
        <div className="py-2 text-center text-sm text-gray-700">No tours found.</div>
      )}
      {artistSlug &&
        sortedTours.map((tour) => (
          <div key={tour.id}>
            <Row href={slugSearchParams.buildUrl(`/${artistSlug}/tours`, { slug: tour.slug || String(tour.id) })}>
              <div>
                <div>{tour.name}</div>
                {(tour.start_date || tour.end_date) && (
                  <div className="text-xxs text-foreground-muted">
                    {formatTourDate(tour.start_date)}
                    {tour.end_date && ` — ${formatTourDate(tour.end_date)}`}
                  </div>
                )}
              </div>
              <div className="text-xxs text-foreground-muted min-w-[20%] text-right">
                {tour.shows_on_tour != null && (
                  <div>{simplePluralize('show', tour.shows_on_tour)}</div>
                )}
              </div>
            </Row>
          </div>
        ))}
    </ColumnWithToggleControls>
  );
};

export default ToursColumnWithControls;
