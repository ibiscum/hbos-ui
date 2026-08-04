# General Sound View

## Scope

src/views/sound/general-sound.vue provides global sound controls for:

- Master output volume limit
- Headphone volume (when the selected sound card exposes a control)
- Left/right balance
- Audio routing mode (Stereo, Swapped, Mono, Left, Right)

The view initializes its state from PipeWire and volume APIs, then applies slider/button updates back to backend APIs.

## Inconsistencies Fixed

- Removed unused system-info integration:
  - Deleted unused `systemInfo` state.
  - Removed unused `getSystemInfo` import.
  - Removed on-mount system-info fetch block that had no effect on UI or behavior.

This reduces dead code and avoids an unnecessary API request during page initialization.

## Consolidated Tests

src/views/sound/__tests__/general-sound.test.ts combines unit and regression coverage for:

- Page shell rendering and section content contracts.
- Initialization from backend values for:
  - master gain percentage and dB display
  - headphone volume display and availability title
  - crossbar-derived mode and balance label
- Volume slider write path (percentage to dB conversion call contract).
- Headphone slider write path and guarded no-op when headphone controls are unavailable.
- Crossbar decode fallback when matrix-to-settings cannot resolve.
- Control-disable behavior when master-gain or crossbar loading fails.
- Mode-write failure behavior (mode remains unchanged and controls disable).
- Balance NaN guard to prevent invalid crossbar writes.

## Why This Matters

General sound settings are a high-traffic control surface that translates UI actions into backend DSP state. Regressions in conversion logic, capability gating, or disable-state handling can produce silent misconfiguration and confusing UX. These tests lock the view’s initialization and write-path contracts while preserving safe fallback behavior under partial backend failure.
