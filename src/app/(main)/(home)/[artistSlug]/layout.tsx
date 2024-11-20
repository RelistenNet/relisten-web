import YearsColumn from '@/components/YearsColumn';
import { MainLayoutProps } from '../layout';

export default async function Page(props: MainLayoutProps) {
  const params = await props.params;

  const {
    children
  } = props;

  const { artistSlug } = params;

  return (
    <>
      <YearsColumn artistSlug={artistSlug} />
      {children}
    </>
  );
}
