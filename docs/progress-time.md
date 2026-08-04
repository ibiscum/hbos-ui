# ProgressTime

## Overview

ProgressTime renders the textual seek-position and duration labels used above the playback slider.
It intentionally hides labels when no usable total duration is available.

Component file: `src/components/ProgressTime.vue`
Tests file: `src/components/__tests__/ProgressTime.test.ts`

## Props

- seekPositionTime: string, default `00:00`
- songDurationTime: string, default `00:00`

## Rendering Contract

- Root class `app-progress-time` is always rendered.
- Time labels are rendered only when `songDurationTime` is meaningful.
- A meaningful duration is any non-empty value other than `00:00`.

When labels are shown:

- The first label shows `seekPositionTime`.
- The second label shows `songDurationTime`.

## Regression and Unit Coverage

`src/components/__tests__/ProgressTime.test.ts` covers:

- Default hidden-label behavior (`00:00` duration).
- Normal rendering with explicit seek and duration values.
- Guard behavior when duration remains `00:00`.
- Regression guard for blank and whitespace-only duration values.
- Fallback seek label behavior when only duration is provided.
