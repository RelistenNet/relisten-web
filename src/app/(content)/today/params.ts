import { defineSearchParams, fromSchema } from '@timber-js/app/params';
import { z } from 'zod/v4';

export const searchParams = defineSearchParams({
  month: fromSchema(z.string().optional()),
  day: fromSchema(z.string().optional()),
});
