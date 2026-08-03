# SongControlInfo

## Overview

`SongControlInfo` renders the compact "now playing" summary used in the sidebar and header layouts.

It combines:

- Cover art preview
- Song title/artist text fallback logic
- Hover metadata tooltip positioning
- Audio control variant switching by context (`isOnHeader`, `isOnSticky`)

## Props

- `isOnSticky?: boolean` (default: `false`)
- `isOnHeader?: boolean` (default: `false`)

## Rendering behavior

- When `currentSong` exists:
  - The clickable song info box is shown.
  - If both `song.title` and `song.artist` exist, two lines are rendered.
  - Otherwise, a single-line fallback renders `title || artist || 'Unknown'`.
- When `currentSong` is missing:
  - The song info box is hidden.
  - Controls remain visible.

## Control variants

- `isOnHeader = true`:
  - Renders `AudioControlsHeader`
  - Hides `AudioControls`
- `isOnHeader = false`:
  - Renders `AudioControls` with `isSeparate`
- `isOnSticky = true`:
  - Applies card styling
  - Hides `ProgressControl`
- `isOnSticky = false`:
  - Shows `ProgressControl`

## Tooltip behavior

The metadata tooltip is shown only while hovering the cover art area.

Positioning is computed from mouse coordinates and clamped to viewport bounds:

- Initial offset: +10px on X and -10px on Y
- Repositions left/up if right or bottom overflow would occur
- Clamps minimum top/left to 10px

## Navigation

Clicking the song info box triggers router navigation to route name `now-playing`.

## Regression coverage

Tests were added in `src/components/__tests__/SongControlInfo.test.ts` to cover:

- Song metadata fallback rendering
- Header vs sticky control switching
- Tooltip show/hide and boundary clamping
- Click-to-navigate behavior
- Regression: `ProgressControl.isOnHeader` now reflects component prop instead of being forced `true`

## Inconsistencies corrected

- Normalized store import path from `@/stores/player.ts` to `@/stores/player`
- Renamed props interface to `SongControlInfoProps` for clarity
- Removed unused nested SCSS selector (`.song-control-info__box__attr`) in favor of the existing `.song-control-info__attr` block
