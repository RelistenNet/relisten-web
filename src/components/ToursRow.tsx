import { RawParams } from '@/types/params';
import RowSegmentMatch from './RowSegmentMatch';

const ToursRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  return (
    <RowSegmentMatch href={`/${artistSlug}/tours`} activeSegments={{ year: 'tours' }}>
      <div>
        <div>Tours</div>
        <div className="text-xxs text-foreground-muted">All Tours</div>
      </div>
    </RowSegmentMatch>
  );
};

export default ToursRow;
