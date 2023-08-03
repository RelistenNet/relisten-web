import { RawParams } from '@/app/(main)/(home)/layout';
import { fetchShow } from '../layout';
import PlayerManager from './PlayerManager';

export default async function Page({ params }: { params: RawParams }) {
  const { artistSlug, year, month, day } = params;

  const show = await fetchShow(artistSlug, year, [year, month, day].join('-'));

  return <PlayerManager {...params} show={show} />;
}
