'use client';

import React from 'react';

import { durationToHHMMSS } from '../lib/utils';

import { Source } from '../types';
import Column from './Column';
import Flex from './Flex';
import Row from './Row';
import RowHeader from './RowHeader';
import { Props, useSourceData } from './SongsColumn';
import Tag from './Tag';
import { useSearchParams } from 'next/navigation';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';

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

const TapesColumn = (props: Props) => {
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();

  const { artistSlug, year, month, day } = props;
  const { sourcesData, activeSourceId } = useSourceData({ ...props, source: String(sourceId) });

  return (
    <Column heading="Sources" className="tapes-column">
      {sourcesData?.map((sourceObj: Source, idx: number) => (
        <div key={sourceObj.id}>
          <RowHeader>
            SOURCE {idx + 1} OF {sourcesData.length}
          </RowHeader>
          <Row
            href={`/${artistSlug}/${year}/${month}/${day}?source=${sourceObj.id}`}
            isActiveOverride={activeSourceId === sourceObj?.id}
          >
            <div>
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
                  <div className="min-w-[48px] pr-2 text-[#696969]">
                    {artistSlug === 'phish' ? 'Dot Net' : 'Rating'}:
                  </div>{' '}
                  <div>
                    {Number(sourceObj.avg_rating).toFixed(2)} /{' '}
                    {sourceObj.num_ratings || sourceObj.num_reviews}{' '}
                    {pluralize('rating', sourceObj?.num_ratings || sourceObj?.num_reviews || 0)}
                  </div>
                </Flex>
              )}
              {exists(sourceObj.taper) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] pr-2 text-[#696969]">Taper:</div>{' '}
                  <div>{sourceObj.taper}</div>
                </Flex>
              )}
              {exists(sourceObj.transferrer) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] pr-2 text-[#696969]">Transferrer:</div>{' '}
                  <div>{sourceObj.transferrer}</div>
                </Flex>
              )}
              {exists(sourceObj.upstream_identifier) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] pr-2 text-[#696969]">SHNID:</div>{' '}
                  <div>{sourceObj.upstream_identifier}</div>
                </Flex>
              )}
              {exists(sourceObj.source) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] pr-2 text-[#696969]">Source:</div>{' '}
                  <div>{sourceObj.source}</div>
                </Flex>
              )}
              {exists(sourceObj.lineage) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] pr-2 text-[#696969]">Lineage:</div>{' '}
                  <div>{sourceObj.lineage}</div>
                </Flex>
              )}
              {exists(sourceObj.taper_notes) && (
                <Flex className="py-1 text-xs">
                  <div className="min-w-[48px] pr-2 text-[#696969]">Taper Notes:</div>{' '}
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
