import { RawParams } from '@/types/params';
import RowSegmentMatch from './RowSegmentMatch';

const ArtistSongsRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  return (
    <RowSegmentMatch href={`/${artistSlug}/songs`} activeSegments={{ year: 'songs' }}>
      <div>
        <div>Songs</div>
        <div className="text-xxs text-foreground-muted">All Songs</div>
      </div>
    </RowSegmentMatch>
  );
};

export default ArtistSongsRow;
