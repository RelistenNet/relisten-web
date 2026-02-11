'use client';

import cn from '@/lib/cn';
import { Features } from '@/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MouseEvent, useTransition } from 'react';

type QuickHitsNavProps = {
  artistSlug?: string;
  features?: Features;
};

const QuickHitsNav = ({ artistSlug, features }: QuickHitsNavProps) => {
  const params = useParams();
  const year = Array.isArray(params.year) ? params.year[0] : params.year;

  const links = [
    { label: 'Recent', segment: 'recently-added' },
    { label: 'Top', segment: 'top' },
    ...(features?.per_show_venues || features?.per_source_venues
      ? [{ label: 'Venues', segment: 'venues' }]
      : []),
    ...(features?.songs ? [{ label: 'Songs', segment: 'songs' }] : []),
    ...(features?.tours ? [{ label: 'Tours', segment: 'tours' }] : []),
  ];

  return (
    <div className="border-background-muted flex flex-wrap justify-between gap-1.5 border-b px-2 py-1.5">
      {links.map(({ label, segment }) => (
        <QuickHitsPill
          key={segment}
          label={label}
          href={`/${artistSlug}/${segment}`}
          isActive={year === segment}
        />
      ))}
    </div>
  );
};

const QuickHitsPill = ({
  label,
  href,
  isActive,
}: {
  label: string;
  href: string;
  isActive: boolean;
}) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey) return;
    e.preventDefault();
    startTransition(() => router.push(href));
  };

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className={cn(
        'rounded px-2 py-0.5 text-sm transition-colors',
        isActive
          ? 'bg-relisten-600 font-medium text-white'
          : 'text-foreground-muted hover:text-foreground hover:bg-gray-100',
        isPending && 'bg-relisten-600/60 text-white hover:bg-relisten-600/60'
      )}
    >
      {label}
    </Link>
  );
};

export default QuickHitsNav;
