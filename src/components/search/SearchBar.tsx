'use client';

import { SearchResultsType } from '@/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';

export default function SearchBar({ resultsType }: { resultsType: SearchResultsType }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const writableParams = new URLSearchParams(searchParams);
  const [value, setValue] = useState<string>(searchParams?.get('q')?.toString() || '');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e?: FormEvent<HTMLFormElement>) {
    if (e) {
      e.preventDefault();
    }

    if (value) {
      writableParams.set('q', value);
    } else {
      writableParams.delete('q');
    }

    startTransition(() => router.replace(`${pathname}?${writableParams.toString()}`));
  }

  function clearSearch() {
    writableParams.delete('artistName');
    writableParams.delete('artistSlug');
    writableParams.delete('artistUuid');
    writableParams.delete('q');
    writableParams.delete('resultsType');
    writableParams.delete('songUuid');
    writableParams.delete('sortBy');
    startTransition(() => {
      setValue('');
      router.replace(`${pathname}?${writableParams.toString()}`);
    });
  }

  return (
    <form className="w-screen max-w-screen-md" onSubmit={handleSubmit}>
      {resultsType === 'versions' ? (
        <button
          className="mb-2 h-[42px] font-semibold"
          onClick={clearSearch}
          aria-label="clear search"
          type="button" // Technically a reset button, but maybe best to use "button" to avoid unexpected behavior
        >
          <i className="fa fa-times" /> Clear search
        </button>
      ) : (
        <div className="search-bar mb-2 flex items-center p-2">
          <i className={isPending ? 'fa fa-spinner px-2' : 'fa fa-search px-2'} />
          <input
            className="grow"
            type="text"
            placeholder="Search..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button onClick={clearSearch} aria-label="clear search" className="flex" type="button">
            <i className="fa fa-times px-2" />
          </button>
        </div>
      )}
    </form>
  );
}
