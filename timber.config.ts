import { nitro } from '@timber-js/app/adapters/nitro';
import { MemoryCacheHandler } from '@timber-js/app/cache';

export default {
  output: 'server' as const,
  adapter: nitro({ preset: 'node-server' }),
  serverTiming: 'detailed' as const,
  cacheHandler: new MemoryCacheHandler({ maxSize: 500 }),
};
