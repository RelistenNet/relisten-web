'use client';

import { href } from '@timber-js/app/routes';
import React from 'react';

import { durationToHHMMSS } from '@/lib/utils';

import { sourceQuery, sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { toSourceParam } from '@/lib/sourceParam';
import type { TapesShow, TapesSource } from '@/lib/showProjection';
import Column from '@/ui/base/Column';
import Flex from '@/ui/base/Flex';
import Row from '@/ui/base/Row';
import RowHeader from '@/ui/base/RowHeader';
import { type ShowDateProps, useSourceData } from '@/ui/shows/TrackList';
import Tag from '@/ui/base/Tag';

const exists = (str = ''): boolean => {
  return !!str && !/unknown/i.test(str);
};

// TODO: i18n
const pluralize = (str: string, count: number): string => {
  if (count === 1) return str;

  return str + 's';
};

const author = (sourceObj: TapesSource) => {
  if (sourceObj.taper) {
    return `Taper: ${sourceObj.taper}`;
  }
  if (sourceObj.transferrer) {
    return `Transferrer: ${sourceObj.transferrer}`;
  }

  return undefined;
};

const TapesColumn = ({
  hrefFor,
  ...props
}: ShowDateProps & {
  show?: TapesShow;
  /** Where a source's row links; the browse view's show by default. */
  hrefFor?: (source: TapesSource) => string;
}) => {
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();

  const { artistSlug, year, month, day } = props;
  const show = artistSlug && year && month && day ? { artistSlug, year, month, day } : null;
  const { sourcesData, activeSourceId } = useSourceData({ ...props, source: String(sourceId) });

  return (
    <Column heading="Sources" className="tapes-column">
      {sourcesData?.map((sourceObj, idx) => (
        <div key={sourceObj.id}>
          <RowHeader>{author(sourceObj) || `Source ${idx + 1} of ${sourcesData.length}`}</RowHeader>
          <Row
            href={
              hrefFor
                ? hrefFor(sourceObj)
                : show
                  ? href('/[artistSlug]/[year]/[month]/[day]', show, sourceQuery(sourceObj.id))
                  : undefined
            }
            active={activeSourceId === sourceObj?.id}
          >
            <div className="w-full">
              <Flex className="mb-1">
                <div className="min-w-[53px]">{durationToHHMMSS(sourceObj.duration)}</div>
                {sourceObj.isSoundboard && <Tag>SBD</Tag>}
                {sourceObj.isRemaster && <Tag>REMASTER</Tag>}
              </Flex>
              {Number(sourceObj?.avgRating) > 0 && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] truncate pr-2 text-foreground-muted">
                    {artistSlug === 'phish' ? 'Dot Net' : 'Rating'}:
                  </div>{' '}
                  <div className="truncate">
                    {Number(sourceObj.avgRating).toFixed(2)} /{' '}
                    {sourceObj.numRatings || sourceObj.numReviews}{' '}
                    {pluralize('rating', sourceObj?.numRatings || sourceObj?.numReviews || 0)}
                  </div>
                </Flex>
              )}
              {exists(sourceObj.taper) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] pr-2 whitespace-nowrap text-foreground-muted">
                    Taper:
                  </div>{' '}
                  <div className="truncate">{sourceObj.taper}</div>
                </Flex>
              )}
              {exists(sourceObj.transferrer) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] truncate pr-2 text-foreground-muted">
                    Transferrer:
                  </div>{' '}
                  <div className="truncate">{sourceObj.transferrer}</div>
                </Flex>
              )}
              {exists(sourceObj.upstreamIdentifier) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] truncate pr-2 text-foreground-muted">SHNID:</div>{' '}
                  <div className="truncate">{sourceObj.upstreamIdentifier}</div>
                </Flex>
              )}
              {exists(sourceObj.source) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] truncate pr-2 text-foreground-muted">Source:</div>{' '}
                  <div className="truncate">{sourceObj.source}</div>
                </Flex>
              )}
              {exists(sourceObj.lineage) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] truncate pr-2 text-foreground-muted">Lineage:</div>{' '}
                  <div className="truncate">{sourceObj.lineage}</div>
                </Flex>
              )}
              {exists(sourceObj.taperNotes) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] truncate pr-2 text-foreground-muted">
                    Taper Notes:
                  </div>{' '}
                  <TaperNotes notes={sourceObj.taperNotes} />
                </Flex>
              )}
            </div>
          </Row>
        </div>
      ))}
    </Column>
  );
};

const TaperNotes = ({ notes }: { notes?: string }) => {
  if (!notes) return null;

  const onClick = (e: React.MouseEvent<HTMLDetailsElement, MouseEvent>) => {
    e.stopPropagation();
  };

  return (
    <details onClick={(e) => onClick(e)} style={{ whiteSpace: 'pre-wrap' }}>
      <summary>View Notes</summary>
      {notes}
    </details>
  );
};

export default React.memo(TapesColumn);
