# useCoverArt Composable

## Overview

`src/composables/useCoverArt.ts` provides a reactive wrapper around `coverArtLoader` for Vue components.

It exposes:

- state for loading, errors, and latest result
- derived values such as `bestCoverArt` and `coverArtSource`
- cache-aware load methods
- cache/state reset helpers

## Core Behavior

### Cached loading

`loadCoverArt(song)` creates a normalized cache key from:

- trimmed title
- trimmed artist
- trimmed album
- lowercase normalization

If a key is available, it first checks:

1. in-memory last-song shortcut
2. shared cache map

If there is no hit, it fetches via `coverArtLoader.findCoverArt(song)`.

### Metadata loading

`loadCoverArtByMetadata(title, artist)` now trims both values before validation.
Whitespace-only values are treated as missing input and return an empty failure result without hitting the API.

### API-only fallback

`loadCoverArtFromAPI(song)` calls `coverArtLoader.findCoverArtFromAPI(song)` and bypasses song-key caching.

### Cache clearing

`clearCache(songKey?)` supports:

- `clearCache()` for full cache reset
- `clearCache(songKey)` for targeted eviction

When a specific key is cleared, the last-song shortcut is also invalidated if it points to that key.
This prevents stale in-memory reuse after targeted cache eviction.

## Tests

`src/composables/__tests__/useCoverArt.test.ts` includes:

- unit coverage for state updates and cache hits
- regression coverage for targeted cache invalidation
- regression coverage for metadata trim/whitespace handling
- availability-check error fallback coverage
