import { defineSearchParams, fromSchema } from '@timber-js/app/params';
import { z } from 'zod/v4';

export const dateSearchParams = defineSearchParams({
  month: fromSchema(z.string().optional()),
  day: fromSchema(z.string().optional()),
});
