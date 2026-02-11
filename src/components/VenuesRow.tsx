import { RawParams } from '@/types/params';
import Row from './Row';

const VenuesRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  return (
    <Row href={`/${artistSlug}/venues`} activeSegments={{ year: 'venues' }}>
      <div>
        <div>Venues</div>
        <div className="text-xxs text-foreground-muted">All Venues</div>
      </div>
    </Row>
  );
};

export default VenuesRow;
