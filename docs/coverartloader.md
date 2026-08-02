# Cover Art Loader

## Overview

The service in `src/services/coverartloader.ts` provides intelligent cover art discovery for songs.
It combines local metadata checks, backend API lookups, and image-quality filtering to return the best available artwork.

This document is the canonical reference for:

- `CoverArtLoader` service behavior
- integration with `useCoverArt` composable
- expected fallback flow and API contracts

## Architecture

### Service Layer

`src/services/coverartloader.ts` exports:

- `coverArtLoader` (singleton, default app usage)
- `createCoverArtLoader()` (factory, useful for isolated tests or DI)

The service uses:

- `useAppConfigStore()` for API base URL resolution
- `apiFetch()` for backend calls through the app's authenticated HTTP wrapper

### Composable Layer

`src/composables/useCoverArt.ts` wraps the service in reactive state for Vue components.

Typical values exposed by the composable:

- loading state
- selected best URL
- source/provider metadata
- load/clear actions

### Component Layer

Common UI consumers include:

- `src/components/CoverArt.vue`
- `src/components/CoverArtExample.vue`

## Fallback Strategy

`findCoverArt(song)` follows this order:

1. Existing song fields: `artwork_url`, `cover_art_url`
2. Song API lookup: title + artist
3. Album API lookup: album + artist
4. Artist API lookup: artist
5. Metadata fallback: `metadata.coverart_url`, then `metadata.logo_url`
6. Empty result (`success: false`, `source: 'none'`)

`findCoverArtFromAPI(song)` runs only steps 2-4.

## API Endpoints

All requests are built as `${apiBaseUrl}/coverart/...`.

- `song/{title_b64}/{artist_b64}`
- `artist/{artist_b64}`
- `album/{album_b64}/{artist_b64}`
- `album/{album_b64}/{artist_b64}/{year}`
- `url/{url_b64}`
- `methods` (availability check)

Text path parameters are URL-safe base64 encoded:

- UTF-8 encode
- base64 encode
- `+` -> `-`, `/` -> `_`, strip `=` padding

## Image Filtering Rules

The service filters each provider's image list in two stages:

1. Square-ish filter (`filterSquareImages`)
- Accept aspect ratio 0.8 to 1.2
- Reject zero-dimension images
- Keep images missing dimensions

2. Resolution filter (`filterByResolution`)
- Find max pixel area in that provider list
- Keep images at least 80% of max area
- Keep images missing dimensions

Providers with no images after filtering are removed.

## Public API Summary

- `findCoverArt(song)` -> full fallback search with metadata shortcuts
- `findCoverArtFromAPI(song)` -> API-only search chain
- `getBestCoverArt(song)` -> first URL or `null`
- `getSongCoverArt(title, artist)`
- `getArtistCoverArt(artist)`
- `getAlbumCoverArt(album, artist, year?)`
- `getCoverArtFromUrl(url)`
- `isApiAvailable()` -> checks `coverart/methods`

Main output type:

```typescript
interface CoverArtResult {
  success: boolean
  urls: string[]
  images: CoverArtImage[]
  source: 'song' | 'album' | 'artist' | 'none'
  providers: CoverArtProvider[]
}
```

## Error Handling Behavior

- Input missing required values: returns empty results for the specific query method
- API non-2xx / network / parse failures: returns `{ results: [] }` from low-level fetch methods
- End-to-end lookup failure: returns `CoverArtResult` with `success: false`

The service prefers graceful degradation over throwing, so UI callers can render fallback states without try/catch-heavy flows.

## Usage Examples

### Service Direct

```typescript
import { coverArtLoader } from '@/services/coverartloader'

const result = await coverArtLoader.findCoverArt(song)
const bestUrl = await coverArtLoader.getBestCoverArt(song)
const apiUp = await coverArtLoader.isApiAvailable()
```

### Composable in Vue

```vue
<template>
  <img v-if="bestCoverArt" :src="bestCoverArt" alt="Cover art" />
  <div v-else-if="loading">Loading...</div>
  <div v-else>No cover art</div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useCoverArt } from '@/composables/useCoverArt'
import { usePlayerStore } from '@/stores/player'

const { loading, bestCoverArt, loadCoverArt } = useCoverArt()
const playerStore = usePlayerStore()

watch(
  () => playerStore.currentSong,
  async (song) => {
    if (song) await loadCoverArt(song)
  },
  { immediate: true },
)
</script>
```

## Notes

- Console logs in the service are useful for debugging but can be noisy in production.
- Backend-side caching and provider aggregation behavior are controlled by the cover art API implementation.
