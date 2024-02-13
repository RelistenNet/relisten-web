import Search from '@/components/Search';

export default async function Page() {
  return (
    <div className="mx-auto w-full max-w-screen-md flex-1">
      <Search />
    </div>
  );
}

export const metadata = {
  title: 'Search',
};
