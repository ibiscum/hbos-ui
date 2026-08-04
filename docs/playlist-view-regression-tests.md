# Playlist View Regression and Unit Tests

## Summary

The playlist/queue view logic was consolidated to reduce drift:

- `src/views/playlist.vue` is now the canonical queue view implementation.
- `src/views/queue.vue` is now a compatibility wrapper that renders `playlist.vue`.

This keeps existing route wiring intact while ensuring there is only one implementation of queue behavior.

## Test Location

- `src/views/__tests__/playlist.test.ts`

## Coverage

The test suite combines regression and unit-style interaction checks for playlist view behavior:

- Mount behavior:
  - Fetches queue on mount when `hasQueue` is enabled.
  - Skips fetch and renders no-support state when `hasQueue` is disabled.
- Rendering states:
  - Loading skeleton state.
  - Empty queue state.
  - Queue list rendering with fallback labels for missing metadata.
- Current-track highlighting:
  - URI-based matching.
  - Fallback title/artist matching when URI is unavailable.
- Interaction behavior:
  - Clicking queue item sends `pause`, `play_queue_index:<index>`, `play` in order.
  - Remove button sends `remove_track:<index>` and does not trigger parent play click.
  - Clear queue sends `clear_queue` and refreshes queue.

## Why This Consolidation Matters

Before consolidation, `playlist.vue` and `queue.vue` had duplicated logic with visual and structural differences. The duplication increased the risk of behavior regressions when one file changed and the other did not.

Using one canonical implementation makes behavior fixes and test updates apply consistently to both entry points.
