# Queue View

## Scope

src/views/queue.vue is a route-level wrapper that delegates rendering to the playlist view implementation.

## Inconsistencies Fixed

- Aligned the PlaylistView import path with project alias conventions (`@/views/playlist.vue`) for consistency with other view imports.

## Consolidated Tests

src/views/__tests__/queue.test.ts combines unit and regression checks for the wrapper:

- Verifies queue view renders PlaylistView as the direct route content.
- Verifies exactly one PlaylistView instance is rendered and no extra shell wrappers are introduced.

## Why This Matters

The queue route intentionally reuses playlist behavior. These tests lock in that pass-through contract so route alias refactors do not accidentally diverge queue and playlist rendering.
