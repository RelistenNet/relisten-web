import { defineSearchParams } from '@timber-js/app/segment-params';
import { fromSchema } from '@timber-js/app/codec';
import type { SearchParamsDefinition, SearchParamCodec } from '@timber-js/app/segment-params';

// Re-export for convenience
export { defineSearchParams, fromSchema };
export type { SearchParamsDefinition, SearchParamCodec };
