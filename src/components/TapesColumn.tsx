'use client';

import React from 'react';

import { durationToHHMMSS } from '../lib/utils';

import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { Source } from '../types';
import Column from './Column';
import Flex from './Flex';
import Row from './Row';
import RowHeader from './RowHeader';
import { Props, useSourceData } from './SongsColumn';
import Tag from './Tag';

const exists = (str = ''): boolean => {
  return !!str && !/unknown/i.test(str);
};

const cleanFlac = (str = ''): string => {
  return str ? str.replace(/Flac|Bit/g, '') + '-BIT ' : '';
};

// TODO: i18n
const pluralize = (str: string, count: number): string => {
  if (count === 1) return str;

  return str + 's';
};

const author = (sourceObj: Source) => {
  if (sourceObj.taper) {
    return `Taper: ${sourceObj.taper}`;
  }
  if (sourceObj.transferrer) {
    return `Transferrer: ${sourceObj.transferrer}`;
  }

  return undefined;
};

const TapesColumn = (props: Props) => {
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();

  const { artistSlug, year, month, day } = props;
  const { sourcesData, activeSourceId } = useSourceData({ ...props, source: String(sourceId) });

  return (
    <Column heading="Sources" className="tapes-column">
      {sourcesData?.map((sourceObj: Source, idx: number) => (
        <div key={sourceObj.id}>
          <RowHeader>{author(sourceObj) || `Source ${idx + 1} of ${sourcesData.length}`}</RowHeader>
          <Row
            href={`/${artistSlug}/${year}/${month}/${day}?source=${sourceObj.id}`}
            isActiveOverride={activeSourceId === sourceObj?.id}
          >
            <div className="w-full">
              <Flex className="mb-1">
                <div className="min-w-[53px]">{durationToHHMMSS(sourceObj.duration)}</div>
                {sourceObj.is_soundboard && <Tag>SBD</Tag>}
                {false && sourceObj.flac_type !== 'NoFlac' && (
                  <Tag>{cleanFlac(sourceObj.flac_type)}FLAC</Tag>
                )}
                {sourceObj.is_remaster && <Tag>REMASTER</Tag>}
              </Flex>
              {Number(sourceObj?.avg_rating) > 0 && (
                <Flex className="py-1 text-xs">
                  <div className="text-foreground-muted min-w-[48px] truncate pr-2 whitespace-nowrap">
                    {artistSlug === 'phish' ? 'Dot Net' : 'Rating'}:
                  </div>{' '}
                  <div className="truncate">
                    {Number(sourceObj.avg_rating).toFixed(2)} /{' '}
                    {sourceObj.num_ratings || sourceObj.num_reviews}{' '}
                    {pluralize('rating', sourceObj?.num_ratings || sourceObj?.num_reviews || 0)}
                  </div>
                </Flex>
              )}
              {exists(sourceObj.taper) && (
                <Flex className="py-1 text-xs">
                  <div className="text-foreground-muted min-w-[48px] pr-2 whitespace-nowrap">
                    Taper:
                  </div>{' '}
                  <div className="truncate">{sourceObj.taper}</div>
                </Flex>
              )}
              {exists(sourceObj.transferrer) && (
                <Flex className="py-1 text-xs">
                  <div className="text-foreground-muted min-w-[48px] truncate pr-2 whitespace-nowrap">
                    Transferrer:
                  </div>{' '}
                  <div className="truncate">{sourceObj.transferrer}</div>
                </Flex>
              )}
              {exists(sourceObj.upstream_identifier) && (
                <Flex className="py-1 text-xs">
                  <div className="text-foreground-muted min-w-[48px] truncate pr-2 whitespace-nowrap">
                    SHNID:
                  </div>{' '}
                  <div className="truncate">{sourceObj.upstream_identifier}</div>
                </Flex>
              )}
              {exists(sourceObj.source) && (
                <Flex className="py-1 text-xs">
                  <div className="text-foreground-muted min-w-[48px] truncate pr-2 whitespace-nowrap">
                    Source:
                  </div>{' '}
                  <div className="truncate">{sourceObj.source}</div>
                </Flex>
              )}
              {exists(sourceObj.lineage) && (
                <Flex className="py-1 text-xs">
                  <div className="text-foreground-muted min-w-[48px] truncate pr-2 whitespace-nowrap">
                    Lineage:
                  </div>{' '}
                  <div className="truncate">{sourceObj.lineage}</div>
                </Flex>
              )}
              {exists(sourceObj.taper_notes) && (
                <Flex className="py-1 text-xs">
                  <div className="text-foreground-muted min-w-[48px] truncate pr-2 whitespace-nowrap">
                    Taper Notes:
                  </div>{' '}
                  <TaperNotes notes={sourceObj.taper_notes} />
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
