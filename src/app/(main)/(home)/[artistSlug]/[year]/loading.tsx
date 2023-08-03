import Column from '@/components/Column';

export default function Loading() {
  return (
    <>
      <Column loading loadingAmount={10} heading="Show" />
      <Column loading loadingAmount={10} heading="Sources" />
    </>
  );
}
