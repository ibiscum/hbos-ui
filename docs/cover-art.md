# CoverArt Component

## Overview

`src/components/CoverArt.vue` renders song cover art with graceful fallback behavior.

It is designed to:

- show a loading placeholder while art is being fetched
- show the best available image when art exists
- recover from broken image URLs by trying API and metadata fallback paths
- render a no-cover placeholder when no image can be resolved

Related test file: `src/components/__tests__/CoverArt.test.ts`

## Props

### `song`

- Type: `Song | null | undefined`
- Default: `undefined`
- Description: Song metadata used to resolve artwork and alt text.

### `size`

- Type: `'small' | 'medium' | 'large'`
- Default: `'medium'`
- Description: Fixed size variant for the cover art container.

### `autoLoad`

- Type: `boolean`
- Default: `true`
- Description: Automatically loads cover art when song identity changes.

### `showSource`

- Type: `boolean`
- Default: `false`
- Description: Shows a small source badge (`song`, `album`, `artist`) when an image is present.

### `adaptToContainer`

- Type: `boolean`
- Default: `false`
- Description: Makes the component fill its parent width/height while preserving square ratio.

## Events

### `loaded`

Emitted after a successful cover-art load attempt.

Payload shape:

```ts
{
  success: boolean
  urls: string[]
  source: string
}
```

### `error`

Emitted when image rendering fails and all fallback paths are exhausted.

Payload shape:

```ts
string
```

## Fallback Flow On Image Error

When an already rendered `<img>` fails to load:

1. If source is `song`, call `loadCoverArtFromAPI(song)`.
2. If API fallback returns at least one URL, emit `loaded` with that result.
3. Otherwise, inspect `song.metadata.coverart_url` then `song.metadata.logo_url`.
4. Try loading metadata URL through `loadCoverArt(...)` so composable state stays consistent.
5. If that still returns no URL, emit a manual metadata fallback result.
6. If none of the above works, emit `error`.

## Regression Notes

Recent consistency fixes:

- Removed duplicate initial load path so initial `autoLoad` executes once (watch with `immediate` is the single trigger).
- Removed noisy console debug output from the component.
- Implemented `showSource` visually via `.cover-source-badge` so the prop is no longer dormant.

## Test Coverage Summary

`src/components/__tests__/CoverArt.test.ts` verifies:

- placeholder rendering with no cover art
- loading state rendering
- regression: single initial auto-load call
- `autoLoad: false` behavior
- composed image alt text
- source badge rendering with `showSource`
- API fallback on image error
- metadata `logo_url` fallback path
- terminal error emission when fallbacks fail
