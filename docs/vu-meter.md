# VuMeter Component

## Overview

[VuMeter.vue](../src/components/VuMeter.vue) renders a two-channel horizontal VU meter used in the sidebar when the feature is enabled.

The component:
- connects to the VU meter store on mount and disconnects on unmount
- smooths RMS levels per animation frame for less jitter
- maintains peak-hold markers that decay over time
- applies clipping styling independently for left and right channels
- fades to a silent state when no signal is present

Related tests: [src/components/__tests__/VuMeter.test.ts](../src/components/__tests__/VuMeter.test.ts)

## Store Contract

The component reads the following store values from [src/stores/vu-meter.ts](../src/stores/vu-meter.ts):
- leftRmsPercent, rightRmsPercent
- leftPeakPercent, rightPeakPercent
- hasSignal
- leftClipping, rightClipping

It also calls:
- connect()
- disconnect()

## Animation Behavior

Each animation frame:
1. Smooth RMS values toward current store percentages with a smoothing factor of 0.3.
2. Update peak-hold markers:
- if the current peak exceeds held peak, jump to the new peak
- otherwise decay by 0.4 percentage points per frame
- clamp at 0 to prevent negative positions
3. Queue the next frame with requestAnimationFrame.

## Styling Notes

- Root element uses .vu-meter--silent when hasSignal is false.
- Channel fill bars use .vu-meter__fill--clip when clipping flags are true.
- Peak markers are positioned with inline left percentages.

## Regression Coverage

[src/components/__tests__/VuMeter.test.ts](../src/components/__tests__/VuMeter.test.ts) covers:
- lifecycle integration (connect/disconnect + RAF cancellation)
- silent-state class toggling
- RMS smoothing progression across frames
- peak hold and decay behavior (including non-negative clamp)
- per-channel clipping class binding
