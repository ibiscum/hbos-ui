# ProgressSlider

## Overview

ProgressSlider is a reusable horizontal slider used for progress, seeking, and level-style controls.
It supports click-to-set behavior, optional drag interactions, and touch interactions.

Component file: `src/components/ProgressSlider.vue`
Tests file: `src/components/__tests__/ProgressSlider.test.ts`

## Props

- value: number (required)
- min: number, default 0
- max: number, default 100
- step: number, default 1
- disabled: boolean, default false
- hasThumb: boolean, default true
- isDraggable: boolean, default false
- isOnHeader: boolean, default false
- centerMark: number | undefined, default undefined

## Event Contract

- click:progress(value: number)

The component emits one normalized numeric value within `[min, max]`, rounded to `step` when `step > 0`.

## Rendering Contract

- Root class: `app-progress-slider`
- Root modifier classes:
  - `disabled` when non-interactive
  - `is-on-header` for compact/header visual style
- Track/progress elements are always rendered.
- Thumb is rendered only when `hasThumb` is true and `isOnHeader` is false.
- Center mark is rendered only when `centerMark` is provided.

## Interaction Behavior

- Mouse click emits `click:progress` from click position.
- Touch tap emits `click:progress` from touch end position.
- Drag mode (`isDraggable=true`):
  - Mouse: drag updates internal slider value and emits final value on mouseup.
  - Touch: drag updates internal slider value and emits final value on touchend.
- Drag and click are de-duplicated so finishing a mouse drag does not emit a second click value.

## Consistency Notes

The visual progress width is derived from internal drag state while dragging and from incoming prop updates otherwise. This keeps the thumb/progress position aligned with the value users are currently dragging, while still remaining controlled by parent updates outside drag interactions.

## Regression and Unit Coverage

`src/components/__tests__/ProgressSlider.test.ts` covers:

- Base rendering and class modifiers.
- Conditional thumb and center-mark rendering.
- Click-to-value mapping with step rounding.
- Min/max clamping behavior.
- Disabled-state non-emission.
- Mouse drag final emit and duplicate-click suppression regression.
- Drag-time visual progress update regression.
- Touch tap and touch drag emit behavior.
