import { RawParams } from '@/types/params';
import Row from './Row';

const ArtistSongsRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  return (
    <Row href={`/${artistSlug}/songs`} activeSegments={{ year: 'songs' }}>
      <div>
        <div>Songs</div>
        <div className="text-xxs text-foreground-muted">All Songs</div>
      </div>
    </Row>
  );
};

export default ArtistSongsRow;
