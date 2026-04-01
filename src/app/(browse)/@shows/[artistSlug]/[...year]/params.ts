import { defineSearchParams } from '@timber-js/app/segment-params';
import { fromSchema } from '@timber-js/app/codec';
import { z } from 'zod/v4';

export const searchParams = defineSearchParams({
  month: fromSchema(z.string().optional()),
  day: fromSchema(z.string().optional()),
  slug: fromSchema(z.string().optional()),
});
