# Room Measurement Wizard

## Overview

`RoomMeasurementWizard` guides users through microphone detection, level setup, room measurement, and saving measured frequency response data.

Component file:
- `src/components/RoomMeasurementWizard.vue`

Tests:
- `src/components/__tests__/RoomMeasurementWizard.test.ts`

## Step Flow

1. Microphone Detection
- Loads microphones from RoomEQ API when the wizard opens.
- User must select a microphone before proceeding.
- If only one microphone is returned, it is auto-selected.

2. Microphone Positioning
- Instructional step.

3. Audio Level
- Pauses active players when entering this step from step 2.
- Supports white-noise playback and SPL polling.

4. Measure Room
- Sends a `startRoomMeasure` request with selected device and options.
- On success, maps response FFT data to chart-ready state.
- Automatically advances to step 5.

5. Save Measurement
- Saves frequency and magnitude arrays to settings storage.
- Emits `measurementCompleted` after a successful save.

## Inconsistencies Fixed

The following issues were corrected in `RoomMeasurementWizard.vue`:

- Renamed typo state from `isNoiseePlaying` to `isNoisePlaying` for consistency.
- Added visible step-4 error rendering so failed room measurement requests are surfaced to users.
- Updated step-4 next-step gating to allow proceeding when FFT data already exists (not only when legacy `recordingFilename` exists).
- Removed duplicate local `settingsStore` initialization inside `saveMeasurement` and reused the existing store instance.

## Regression and Unit Coverage

`RoomMeasurementWizard.test.ts` now validates:

- microphone loading and selection gate behavior for step 1;
- pause-all-players side effect when moving from step 2 to step 3;
- step-4 API payload mapping for selected microphone/channel/count/FFT settings;
- successful measurement auto-advance to step 5;
- ability to return to step 4 after measurement and proceed again;
- save behavior (trimmed name, expected payload, completion emit).
