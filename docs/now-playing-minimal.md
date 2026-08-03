# Now Playing Minimal View

## Scope

src/views/now-playing-minimal.vue is a fullscreen now-playing surface optimized for compact display mode. It shares playback controls with the standard now-playing view and applies temporary page-level state while active (scroll lock and optional dark mode query behavior).

## Inconsistencies Fixed

- Removed dead hidden title markup that was never visible but still contained stale "Switch to minimal view" copy.
- Added explicit modal semantics to the root container for accessibility consistency:
  - role="dialog"
  - aria-modal="true"
  - aria-label="Now Playing minimal view"
- Reworked dark-mode class handling to be route-reactive and ownership-safe:
  - `?dark` now applies the class immediately and while mounted.
  - Removing `?dark` while mounted removes the class only if this view added it.
  - Unmount cleanup no longer removes a pre-existing dark class that was set elsewhere.
- Aligned store import path to project mocking conventions (`@/stores/player`).

## Consolidated Unit + Regression Tests

src/views/__tests__/now-playing-minimal.test.ts now provides a focused suite with behavior assertions instead of placeholder checks:

- Rendering and structure of major regions/components.
- Body scroll lock on mount and restoration on unmount.
- Dark mode behavior:
  - activation with `?dark`
  - cleanup on unmount
  - no removal of pre-existing dark class
  - reactive updates when query changes while mounted
- Song metadata rendering with and without current song data.
- Metadata tooltip visibility and viewport boundary positioning.
- Cover-art loaded/error event handler wiring.

## Why This Matters

The updated suite protects real user-facing behavior (layout shell, lock state, dark query handling, tooltip placement) and avoids false confidence from assertion-light tests. The component now has clearer accessibility intent and safer global-state cleanup semantics.

## Related

- Standard variant: [Now Playing View](./now-playing.md)
