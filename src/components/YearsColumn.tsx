import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';

import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import Column from './Column';
import Row from './Row';
import TodayInHistoryRow from './TodayInHistoryRow';

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const [artists, artistYears] = await Promise.all([
    RelistenAPI.fetchArtists(),
    RelistenAPI.fetchYears(artistSlug),
  ]).catch(() => {
    notFound();
    return [];
  });

  const artist = artists?.find((artist) => artist.slug === artistSlug);

  return (
    <Column heading={artist?.name ?? 'Years'}>
      <TodayInHistoryRow artistSlug={artistSlug} />
      {artistSlug &&
        artistYears.length &&
        sortActiveBands(artistSlug, artistYears).map((yearObj) => (
          <Row
            key={yearObj.id}
            href={`/${artistSlug}/${yearObj.year}`}
            activeSegments={{ year: yearObj.year }}
          >
            <div>
              <div>{yearObj.year}</div>
            </div>
            <div className="min-w-[20%] text-right text-xxs text-[#979797]">
              <div>{simplePluralize('show', yearObj.show_count)}</div>
              <div>{simplePluralize('tape', yearObj.source_count)}</div>
            </div>
          </Row>
        ))}
    </Column>
  );
};

export default YearsColumn;
