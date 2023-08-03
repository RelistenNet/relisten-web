import ShowsColumn from '@/components/ShowsColumn';
import { MainLayoutProps } from '../../layout';

export default function Page({ params, children }: MainLayoutProps) {
  const { artistSlug, year } = params;

  return (
    <>
      <ShowsColumn artistSlug={artistSlug} year={year} />
      {children}
    </>
  );
}
