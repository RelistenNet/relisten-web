import YearsColumn from '@/components/YearsColumn';
import { MainLayoutProps } from '../layout';

export default function Page({ params, children }: MainLayoutProps) {
  const { artistSlug } = params;

  return (
    <>
      <YearsColumn artistSlug={artistSlug} />
      {children}
    </>
  );
}
