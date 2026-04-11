import { defineSchema } from '@timber-js/app/params';
import z from 'zod/v4';

export default defineSchema({
  segmentParams: {
    '[...artistSlug]': z.tuple([z.string()]).rest(z.string().optional()),
    '[...day]': z.tuple([z.string()]).rest(z.string().optional()),
    '[...year]': z.tuple([z.string()]).rest(z.string().optional()),
    '[artistSlug]': z.string(),
    '[day]': z.string().regex(/[\dx]{1,2}/i),
    '[month]': z.string().regex(/[\dx]{1,2}/i),
    '[songSlug]': z.string(),
    '[year]': z.string().regex(/[\d]{4}/),
  },
});
