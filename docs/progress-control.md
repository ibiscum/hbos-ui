# ProgressControl

## Overview

ProgressControl composes the playback timeline UI used in now-playing layouts.
It wires player and audio-control store state into two child components:

- ProgressTime for textual time labels
- ProgressSlider for seek interaction

Component file: `src/components/ProgressControl.vue`
Tests file: `src/components/__tests__/ProgressControl.test.ts`

## Props

- min: number, default 0
- max: number, default 100
- step: number, default 1
- hasThumb: boolean, default true
- isDraggable: boolean, default false
- isOnHeader: boolean, default false

## Render Contract

- ProgressTime is rendered only when isOnHeader is false.
- ProgressSlider is always rendered.
- Slider value is bound to audioControls.seekPosition.
- Slider disabled state is true when either:
  - playerStore.isSendingCommand is true, or
  - playerStore.playerCapabilities.canSeek is false

## Child Prop Mapping

ProgressControl forwards:

- ProgressTime:
  - seek-position-time <- audioControls.seekPositionTime
  - song-duration-time <- audioControls.songDurationTime
- ProgressSlider:
  - value <- audioControls.seekPosition
  - min, max, step, has-thumb, is-draggable, is-on-header <- corresponding ProgressControl props

## Seek Behavior

ProgressControl listens for the slider click:progress event and calls audioControls.seekToPosition(value) only when seeking is currently enabled.

Guard condition:

- ignore seek events while sending commands
- ignore seek events when canSeek is false

This defensive guard prevents accidental command dispatch even if a child component emits events while disabled.

## Regression and Unit Coverage

`src/components/__tests__/ProgressControl.test.ts` covers:

- Default component layout rendering.
- Header mode conditional rendering (ProgressTime hidden).
- Store value forwarding to ProgressTime.
- Default and explicit prop forwarding to ProgressSlider.
- Disabled state logic from command and capability flags.
- Seek event forwarding in enabled state.
- Regression guard: seek event is ignored while disabled.
