# Display View

## Scope

src/views/services/display.vue is the route-level Display Settings page. It presents theme preference toggles and conditionally exposes VU meter controls based on platform capability.

## Inconsistencies Fixed

- Added missing `id` targets for `aria-describedby` references on dark mode and VU meter toggle descriptions.
- Removed noisy mount-time dark-mode debug/warn logging that did not affect runtime behavior.
- Simplified VU meter toggle error path by removing redundant loading-state reset in the catch block.

## Consolidated Tests

src/views/services/__tests__/display.test.ts combines unit and regression coverage for:

- Core page rendering and info-card copy.
- Accessibility linkage for dark mode and VU meter toggles.
- Conditional VU meter visibility and disabled-state behavior.
- Success and failure flows for VU meter updates (toast messages and error fallback).
- Guards for null capability/state values.

## Why This Matters

This page controls user-facing presentation features and hardware-dependent controls. Regressions can silently break accessibility bindings or expose unavailable controls. The consolidated suite protects both interaction behavior and safety guards while keeping test intent focused.
