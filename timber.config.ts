import { nitro } from '@timber-js/app/adapters/nitro';

export default {
  output: 'server' as const,
  adapter: nitro({ preset: 'node-server' }),
};
