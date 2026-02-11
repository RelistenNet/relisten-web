import { RawParams } from '@/types/params';
import Row from './Row';

const ToursRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  return (
    <Row href={`/${artistSlug}/tours`} activeSegments={{ year: 'tours' }}>
      <div>
        <div>Tours</div>
        <div className="text-xxs text-foreground-muted">All Tours</div>
      </div>
    </Row>
  );
};

export default ToursRow;
