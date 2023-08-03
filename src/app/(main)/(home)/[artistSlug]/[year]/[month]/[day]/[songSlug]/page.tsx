import { MainLayoutProps } from '@/app/(main)/(home)/layout';
import PlayerManager from './PlayerManager';
import { fetchShow } from '../layout';

export default async function Page({ params }: MainLayoutProps) {
  const { artistSlug, year, month, day } = params;

  const show = await fetchShow(artistSlug, year, [year, month, day].join('-'));

  return <PlayerManager {...params} show={show} />;
}
