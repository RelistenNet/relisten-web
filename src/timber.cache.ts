import { MemoryCacheHandler } from '@timber-js/app/cache';

const MB = 1024 * 1024;

// Bounded by bytes, not just entries: entry sizes range from a few KB to several
// MB (a show with all its tapes, an artist's every show), so an entry count alone
// doesn't bound memory. Sizes are timber's estimate (JSON length × 2). Least
// recently used entries are evicted first.
export default new MemoryCacheHandler({
  maxEntries: 2000,
  maxBytes: 128 * MB,
  // The artist directory is the largest entry (~7 MB); anything far beyond that
  // is a surprise and shouldn't push out everything else.
  maxEntryBytes: 16 * MB,
});
