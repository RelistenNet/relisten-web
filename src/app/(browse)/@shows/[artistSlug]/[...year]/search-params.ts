import { defineSearchParams, fromSchema } from '@timber-js/app/params';
import { z } from 'zod/v4';

export default defineSearchParams({
  month: fromSchema(z.string().optional()),
  day: fromSchema(z.string().optional()),
  slug: fromSchema(z.string().optional()),
});
