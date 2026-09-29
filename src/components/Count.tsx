import { splitPluralize } from '@/lib/utils';

export default function Count({ unit, value }: { unit: string; value: number | undefined }) {
  const [n, u] = splitPluralize(unit, value ?? 0);
  return (
    <>
      <span className="font-medium text-foreground-muted">{n}</span>{' '}
      <span className="text-text-muted">{u}</span>
    </>
  );
}
