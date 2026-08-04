# Library Radio View

## Scope

src/views/library/radio.vue is the Radio screen in Music Library. It handles station search, favorites, long-press editing, and playback interactions.

## Inconsistencies Fixed

- Added mount-time error handling so radio initialization failures are logged without breaking the view.
- Improved long-press safety by canceling stale timers before starting a new one and clearing timer state when the press is recognized.
- Reset long-press suppression state when edit popup closes to prevent stale suppression from blocking later normal clicks.
- Normalized tag parsing by trimming and removing empty values before limiting to three visible tags.

## Consolidated Tests

src/views/library/__tests__/radio.test.ts combines unit and regression coverage for:

- Store initialization on mount.
- Graceful behavior when initialization rejects.
- Search flow for non-empty query and clear flow for empty query.
- Favorite removal and search-result favorite toggling without accidental playback.
- Tag rendering contract (top three non-empty tags).
- Long-press edit popup behavior with playback suppression regression.
- Save flow from edit popup through store edit action and popup close.

## Why This Matters

The radio screen mixes multiple interaction modes (tap, long-press, search, and edit). Regressions here are easy to miss and can cause accidental playback or broken edit flows. These changes and tests make interaction outcomes deterministic and protect behavior under async and gesture-heavy paths.
