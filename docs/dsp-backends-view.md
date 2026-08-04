# DSP Backends View

## Scope

src/views/services/dsp-backends.vue is the route-level backend selection page for DSP filter processing. It displays available backend implementations, availability status, backend capabilities, and detailed backend descriptions.

## Inconsistencies Fixed

- Added semantic section heading (Backend Selection) so existing header styles are fully applied.
- Added user-facing toast feedback when backend details fail to load.
- Hardened mount initialization path with explicit error handling and toast notification.
- Fixed minor formatting inconsistency around mount initialization comment/function boundary.

## Consolidated Tests

src/views/services/__tests__/dsp-backends.test.ts combines unit and regression coverage for:

- Page shell and header rendering.
- Mount-time backend initialization and capability display.
- DSP unavailable state rendering.
- Backend details modal flow.
- Backend switch success path.
- DSP-unavailable switch blocking with error toast.
- Fallback from unavailable DSP current backend to demo backend.
- Initialization-failure error handling.

## Why This Matters

Backend selection directly affects how filter edits are applied system-wide. Regressions here can leave users on unavailable backends, hide capability limits, or fail silently during initialization. The consolidated suite protects status rendering, switching safety checks, and initialization resilience.
