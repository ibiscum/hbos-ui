# LyricsOverlay

## Overview

LyricsOverlay displays a modal lyrics panel for the current song and supports synced line highlighting based on player position.

Component file: `src/components/LyricsOverlay.vue`  
Tests file: `src/components/__tests__/LyricsOverlay.test.ts`

## Props and Emits

### Props

- `isVisible: boolean`: Controls whether the overlay is rendered.
- `song?: Song | null`: Current song object. Lyrics are fetched from `song.metadata.lyrics_url` when visible.

### Emits

- `close`: Emitted when the overlay should be dismissed.

## Rendering States

The body area has four mutually exclusive states:

- Loading: `Loading lyrics...`
- Error: API or availability error text
- Lyrics list: rendered line-by-line from `lyrics.lyrics`
- Empty state: `No lyrics available`

## Sync and Highlight Logic

- The component reads playback time from `usePlayerPosition()`.
- Highlighting is enabled only for timed lyrics.
- Untimed lyrics (all timestamps are `0`) intentionally do not highlight any line.
- Empty lyric lines are never highlighted.

## Close Behavior

Overlay close is triggered by:

- Clicking the backdrop
- Clicking the close button
- Pressing `Escape` while visible

Clicks inside the content panel do not close the overlay.

## Fetch Behavior

- Lyrics URL is normalized with `rewriteAudiocontrolApiUrl` before calling `fetch`.
- Fetch runs when:
  - The overlay becomes visible and a lyrics URL exists
  - The lyrics URL changes while the overlay is visible
- Regression guard: initial visible mount performs one fetch only.

## Regression and Unit Coverage

`src/components/__tests__/LyricsOverlay.test.ts` verifies:

- Visibility rendering contract
- Fetch trigger rules and URL rewrite contract
- Single-fetch regression on initial visible mount
- Loading, error, and success rendering states
- Timed highlighting and untimed non-highlighting behavior
- Overlay close interactions and Escape key handling
