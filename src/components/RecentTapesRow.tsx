import { RawParams } from '@/types/params';
import RowSegmentMatch from './RowSegmentMatch';

const RecentTapesRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  return (
    <RowSegmentMatch
      href={`/${artistSlug}/recently-added`}
      activeSegments={{ year: 'recently-added' }}
    >
      <div>
        <div>Recent Tapes</div>
        <div className="text-xxs text-foreground-muted">The Newest Recordings</div>
      </div>
      <div className="text-xxs text-foreground-muted min-w-[20%] text-right">
        <div>fresh shows</div>
        <div>fresh tapes</div>
      </div>
    </RowSegmentMatch>
  );
};

export default RecentTapesRow;
