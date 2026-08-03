# CoverArtExample Component

## Overview

`src/components/CoverArtExample.vue` is an interactive demo component for validating and troubleshooting cover-art loading behavior.

It provides:

- a visual state panel for loading, error, success, and empty results
- manual inputs for title, artist, and album
- sample data loading for quick verification
- API availability checks through the `useCoverArt` composable

Related tests: `src/components/__tests__/CoverArtExample.test.ts`

## UI States

The cover-art panel renders one of these states:

1. Loading: `loading` is true.
2. Error: `error` contains a message.
3. Success: `hasCoverArt` is true and the primary image URL is rendered.
4. Empty: fallback message when no image exists.

When multiple URLs are available, an expandable list appears with links to each URL.

## Input and Action Behavior

### Required fields

`Load Cover Art` is enabled only when both title and artist contain non-whitespace content.

### Normalization

Before loading, title, artist, and album are trimmed:

- title and artist are required after trimming
- album is optional and converted to `undefined` when empty

This keeps behavior consistent with service-layer validation and avoids whitespace-only requests.

### Buttons

All action buttons use `type="button"` to prevent accidental form-submission behavior if embedded in forms.

### External links

The expanded URL list uses secure external-link attributes:

- `target="_blank"`
- `rel="noopener noreferrer"`

## API Status

On mount, the component calls `checkApiAvailability()` and shows:

- `API Available` for truthy results
- `API Unavailable` for falsy results

A manual `Check API Status` button re-runs this check.

## Regression and Unit Coverage

`src/components/__tests__/CoverArtExample.test.ts` verifies:

- default empty rendering
- API status check on mount
- required-field and whitespace guard behavior
- normalized payload passed to `loadCoverArt`
- clear action resets form and composable-driven visual state
- sample-data autofill behavior
- secure multi-URL link rendering
- composable error rendering
