import { defineSearchParams, fromSchema } from '@timber-js/app/params';
import { z } from 'zod/v4';

export const slugSearchParams = defineSearchParams({
  slug: fromSchema(z.string().optional()),
});
