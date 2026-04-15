import { defineSchema } from '@timber-js/app/params';
import z from 'zod/v4';
import { codec } from '@timber-js/app/codec';

export default defineSchema({
  segmentParams: {
    '[artistSlug]': z.string(),
    '[day]': z.string().regex(/[\dx]{1,2}/i),
    '[month]': z.string().regex(/[\dx]{1,2}/i),
    '[songSlug]': z.string(),
    '[year]': z.string().regex(/[\d]{4}/),

    '[...artistSlugs]': codec.stringArray,
    '[...days]': codec.stringArray,
    '[...years]': codec.stringArray,
    '[slug]': codec.string,
  },
});
