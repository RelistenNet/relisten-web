import { MemoryCacheHandler } from '@timber-js/app/cache';

const MB = 1024 * 1024;

// Per-process LRU cache for timber.cache (API responses).
//
// Byte limits are in timber's estimateByteSize units, which count ~2× raw JSON
// size (strings as UTF-16). Actual V8 heap is ~1.15× raw, so estimated ≈ 1.75×
// real memory.
//
// Measured (estimated units): typical show ~60–150 KB, big GD shows up to
// ~0.8 MB, all-artists list ~12.2 MB. A full cache under normal traffic is
// roughly 50–100 MB of real heap; maxBytes is a ceiling for pathological crawls.
//
// The all-artists list is read by NavBar on every request, so LRU keeps it hot.
// maxEntryBytes must stay well above its estimated size or it won't be cached.
export default new MemoryCacheHandler({
  maxEntries: 1000,
  maxBytes: 224 * MB, // ≈ 128 MB real heap
  maxEntryBytes: 32 * MB, // ≈ 18 MB real heap
});
