import { RawParams } from '@/types/params';
import RowSegmentMatch from './RowSegmentMatch';

const VenuesRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  return (
    <RowSegmentMatch href={`/${artistSlug}/venues`} activeSegments={{ year: 'venues' }}>
      <div>
        <div>Venues</div>
        <div className="text-xxs text-foreground-muted">All Venues</div>
      </div>
    </RowSegmentMatch>
  );
};

export default VenuesRow;
