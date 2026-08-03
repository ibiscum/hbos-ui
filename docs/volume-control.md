# VolumeControl.vue

## Overview

VolumeControl is a compact UI control for changing player volume through `usePlayerStore`.
It renders mute/speaker icons and delegates slider interaction to `ProgressSlider`.

- Component: `src/components/VolumeControl.vue`
- Tests: `src/components/__tests__/VolumeControl.test.ts`

## Props

```ts
interface Props {
  size?: 'compact' | 'normal' | 'wide' | 'large'
}
```

Default:

- `size = 'compact'`

## Store Integration

The component uses `usePlayerStore` and reads:

- `currentVolume` (reactive current value)

The component writes:

- `setVolume(volume)` when the slider emits `click:progress`

## Behavior

1. Slider value is derived from store volume and normalized to an integer in the range `0..100`.
2. Emitted slider values are normalized before calling `setVolume`.
3. Header-style slider behavior (`isOnHeader`) is enabled only when `size === 'compact'`.

## Regression Coverage

The tests cover these regressions:

- Non-compact sizes must not force header slider mode.
- Out-of-range incoming store values are clamped for display.
- Out-of-range emitted slider values are clamped before store update.

## Rendering Contract

- Root classes:
  - `.volume-control`
  - `.volume-control--{size}`
- Icons:
  - `.volume-icon--mute`
  - `.volume-icon--speaker`
- Slider receives fixed range props:
  - `min=0`, `max=100`, `step=1`
  - `hasThumb=true`, `isDraggable=true`
