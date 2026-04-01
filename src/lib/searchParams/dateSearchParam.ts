import { defineSearchParams } from '@timber-js/app/segment-params';
import { fromSchema } from '@timber-js/app/codec';
import { z } from 'zod/v4';

export const dateSearchParams = defineSearchParams({
  month: fromSchema(z.string().optional()),
  day: fromSchema(z.string().optional()),
});
