import { RawParams } from '@/types/params';
import Row from './Row';

const TopTapesRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  return (
    <Row href={`/${artistSlug}/top`} activeSegments={{ year: 'top' }}>
      <div>
        <div>Top Tapes</div>
        <div className="text-xxs text-foreground-muted">Highest Rated</div>
      </div>
      <div className="text-xxs text-foreground-muted min-w-[20%] text-right">
        <div>top shows</div>
        <div>best tapes</div>
      </div>
    </Row>
  );
};

export default TopTapesRow;
