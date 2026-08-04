# Now Playing View

## Scope

src/views/now-playing.vue is the primary now-playing surface inside the standard page shell. It renders cover art, metadata, playback controls, progress control, and volume control, with a hover metadata tooltip over cover art.

## Inconsistencies Fixed

- Normalized player store import path from `@/stores/player.ts` to `@/stores/player` so it follows project conventions and existing mock patterns.

## Consolidated Unit + Regression Tests

src/views/__tests__/now-playing.test.ts now provides a consolidated behavior-focused suite:

- Page shell wiring and expected PageContent hint props (`Now Playing`, minimal-view link/hint copy).
- Rendering of core child controls (cover art, audio controls, progress control, volume control) and critical props.
- Song metadata rendering with populated song data.
- Regression: metadata and tooltip remain hidden when there is no current song.
- Tooltip behavior:
  - show/hide on cover hover transitions
  - viewport boundary handling near bottom-right
  - top-left clamping to minimum offsets
- Cover-art loaded/error event handler wiring and console payload shape.

## Why This Matters

The suite protects the current now-playing user experience against regressions in core rendering, hover-driven metadata behavior, and control wiring, while the import-path normalization avoids subtle test/mock drift between views.