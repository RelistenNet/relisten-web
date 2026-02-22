import { createSearchParams } from '@/lib/searchParams/createSearchParams';
import { formatTimeParam, parseTimeParam } from '@/lib/timeParam';
import { createParser } from 'nuqs/server';
import { z } from 'zod/v4';

const parseAsTime = createParser({
  parse: (value: string) => {
    const seconds = parseTimeParam(value);
    return seconds > 0 ? seconds : null;
  },
  serialize: (value: number) => formatTimeParam(value),
});

export const tSchema = z.object({
  t: z.number().nullable(),
});

export const tParser = {
  t: parseAsTime.withDefault(0),
};

export const tSearchParamsLoader = createSearchParams(tSchema, tParser);
