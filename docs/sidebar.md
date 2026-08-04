# Sidebar Component

## Overview

`Sidebar.vue` renders the primary application navigation, optional mobile playback controls, optional VU meter, and brand logos for collapsed and expanded states.

Component file: `src/components/Sidebar.vue`  
Test file: `src/components/__tests__/Sidebar.test.ts`

## Props

### `isPlayerControls`

- Type: `boolean`
- Default: `true`
- Description: Controls whether the mobile-only sticky playback controls section is rendered.

## Navigation Model

The component builds routes from static groups and one capability-dependent child route.

Top-level groups:
- Now Playing
- Music Library
- Sound
- Settings

Capability-dependent behavior:
- Queue (`playlist`) is included under Now Playing only when `playerCapabilities.hasQueue` is true.

## Store Dependencies

### Player Store (`usePlayerStore`)

- Uses `playerCapabilities.hasQueue` to decide whether to show Queue.

### Settings Store (`useSettingsStore`)

- Uses `getVuMeterEnabled` and `isPi5OrHigher`.
- VU meter is rendered only when both are true.

## Conditional Rendering Rules

- Mobile playback controls section:
  - Rendered when `isPlayerControls` is true.
  - Hidden when `isPlayerControls` is false.
- VU meter:
  - Rendered only when `getVuMeterEnabled && isPi5OrHigher`.
- Logos:
  - Expanded logo uses `images/logo.svg`.
  - Collapsed logo uses `images/logo-small.svg`.

## Regression Notes

The test suite documents and protects these regressions:
- Queue entry must disappear when queue capability is disabled.
- Mobile controls must not render when `isPlayerControls` is false.
- VU meter must not render when disabled in settings or on unsupported hardware.

## Test Coverage Summary

`src/components/__tests__/Sidebar.test.ts` validates:
- Base layout rendering (sidebar and logos)
- Prop-driven rendering for mobile controls
- Top-level navigation group presence
- Capability-driven Queue route inclusion/exclusion
- Settings/hardware-gated VU meter visibility
