import React from 'react';
import { connect } from 'react-redux';

import { createShowDate, splitShowDate, durationToHHMMSS } from '../lib/utils';

import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';
import { Meta, Source, Tape } from '../types';
import Flex from './Flex';

const exists = (str: string): boolean => {
  return str && !/unknown/i.test(str);
};

const cleanFlac = (str: string): string => {
  return str ? str.replace(/Flac|Bit/g, '') + '-BIT ' : '';
};

// TODO: i18n
const pluralize = (str: string, count: number): string => {
  if (count === 1) return str;

  return str + 's';
};

type TapesColumnProps = {
  tapes: {
    data: Tape;
    meta: Meta;
  };
  artistSlug: string;
  activeSourceId: number;
};

const TapesColumn = ({ tapes, artistSlug, activeSourceId }: TapesColumnProps): JSX.Element => {
  const sources =
    tapes.data && tapes.data.sources && tapes.data.sources.length ? tapes.data.sources : null;

  const { year, month, day } = sources
    ? splitShowDate(sources[0].display_date)
    : { year: '', month: '', day: '' };

  return (
    <Column heading="Sources" loading={tapes.meta && tapes.meta.loading} loadingAmount={1}>
      {sources &&
        sources.map((source: Source, idx: number) => (
          <div key={source.id}>
            <RowHeader>
              SOURCE {idx + 1} OF {sources.length}
            </RowHeader>
            <Row
              href={`/${artistSlug}/${year}/${month}/${day}?source=${source.id}`}
              active={source.id === activeSourceId || (!activeSourceId && idx === 0)}
            >
              <div>
                <Flex className="mb-1">
                  <div className="min-w-[53px]">{durationToHHMMSS(source.duration)}</div>
                  {source.is_soundboard && <Tag>SBD</Tag>}
                  {false && source.flac_type !== 'NoFlac' && (
                    <Tag>{cleanFlac(source.flac_type)}FLAC</Tag>
                  )}
                  {source.is_remaster && <Tag>REMASTER</Tag>}
                </Flex>
                {source.avg_rating > 0 && (
                  <Flex className="py-1 text-xs">
                    <div className="min-w-[48px] pr-2 text-[#696969]">
                      {artistSlug === 'phish' ? 'Dot Net' : 'Rating'}:
                    </div>{' '}
                    <div>
                      {Number(source.avg_rating).toFixed(2)} /{' '}
                      {source.num_ratings || source.num_reviews}{' '}
                      {pluralize('rating', source.num_ratings || source.num_reviews)}
                    </div>
                  </Flex>
                )}
                {exists(source.taper) && (
                  <Flex className="py-1 text-xs">
                    <div className="min-w-[48px] pr-2 text-[#696969]">Taper:</div>{' '}
                    <div>{source.taper}</div>
                  </Flex>
                )}
                {exists(source.transferrer) && (
                  <Flex className="py-1 text-xs">
                    <div className="min-w-[48px] pr-2 text-[#696969]">Transferrer:</div>{' '}
                    <div>{source.transferrer}</div>
                  </Flex>
                )}
                {exists(source.upstream_identifier) && (
                  <Flex className="py-1 text-xs">
                    <div className="min-w-[48px] pr-2 text-[#696969]">SHNID:</div>{' '}
                    <div>{source.upstream_identifier}</div>
                  </Flex>
                )}
                {exists(source.source) && (
                  <Flex className="py-1 text-xs">
                    <div className="min-w-[48px] pr-2 text-[#696969]">Source:</div>{' '}
                    <div>{source.source}</div>
                  </Flex>
                )}
                {exists(source.lineage) && (
                  <Flex className="py-1 text-xs">
                    <div className="min-w-[48px] pr-2 text-[#696969]">Lineage:</div>{' '}
                    <div>{source.lineage}</div>
                  </Flex>
                )}
                {exists(source.taper_notes) && (
                  <Flex className="py-1 text-xs">
                    <div className="min-w-[48px] pr-2 text-[#696969]">Taper Notes:</div>{' '}
                    <TaperNotes notes={source.taper_notes} />
                  </Flex>
                )}
              </div>
            </Row>
          </div>
        ))}
    </Column>
  );
};

const TaperNotes = ({ notes }: { notes: string }): JSX.Element => {
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

const mapStateToProps = ({ tapes, app }): TapesColumnProps => {
  const showDate = createShowDate(app.year, app.month, app.day);
  const showTapes =
    tapes[app.artistSlug] && tapes[app.artistSlug][showDate] ? tapes[app.artistSlug][showDate] : {};

  return {
    tapes: showTapes,
    artistSlug: app.artistSlug,
    activeSourceId: parseInt(app.source, 10),
  };
};

export default connect(mapStateToProps)(TapesColumn);
