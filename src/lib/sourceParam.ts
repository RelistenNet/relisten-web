// `?source=` carries a v4 source id without its `source_` prefix:
//   /grateful-dead/1977/05/08?source=7bbw2e16a0h9ssczd3bwzgv1wp
// Shared by server and client code.

const PREFIX = 'source_';

/** v4 source id → URL value. */
export const toSourceParam = (sourceId: string | undefined | null) =>
  sourceId ? sourceId.replace(/^source_/, '') : '';

/** URL value → v4 source id (also accepts the prefixed form). Empty for nothing. */
export const fromSourceParam = (param: string | undefined | null) => {
  if (!param) return '';
  return param.startsWith(PREFIX) ? param : PREFIX + param;
};

/** Pre-v4 values: integer source ids (old shared links) and v3 source uuids. */
export const LEGACY_SOURCE_INTEGER = /^\d{1,10}$/;
export const LEGACY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isLegacySourceParam = (param: string | undefined | null) =>
  !!param && (LEGACY_SOURCE_INTEGER.test(param) || LEGACY_UUID.test(param));
