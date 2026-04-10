import { defineSchema } from '@timber-js/app/params';
import z from 'zod/v4';

export default defineSchema({
  segmentParams: {
    '[...artistSlug]': z.array(z.string()),
    '[...day]': z.array(z.string()),
    '[...year]': z.array(z.string()),
    '[artistSlug]': z.string(),
    '[day]': z.string().regex(/[\dx]{1,2}/i),
    '[month]': z.string().regex(/[\dx]{1,2}/i),
    '[songSlug]': z.string(),
    '[year]': z.string().regex(/[\d]{4}/),
  },
});
