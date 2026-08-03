# Room Equalisation Wizard

## Overview

The room equalisation wizard guides users through six steps:

1. Review measured frequency response.
2. Choose equalisation options and target curve.
3. Configure optimisation options and usable frequency range.
4. Run optimisation.
5. Review generated filters and corrected response.
6. Save the generated configuration.

The component is implemented in `src/components/RoomEqualisationWizard.vue`.

## Key Runtime Behavior

### Target preset loading

- Target presets are loaded on mount and each time the wizard opens.
- The wizard prefers `flat` when available; otherwise it falls back to the first preset key.

### Usable frequency range detection

- On entry to Step 3, the wizard calls `detectUsableFrequencyRange`.
- It supports nested server response shape under `usable_frequency_range`.
- Recommended frequency limits are applied to user inputs:
  - `recommended_min` is preferred over raw low bound.
  - `recommended_max` is preferred over raw high bound.
- If the detected low usable frequency is above thresholds, low-pass/high-pass options are auto-enabled.

### Optimizer preset handling

- In export mode, optimizer presets are loaded from `/eq/presets/optimizers`.
- Preset selection drives optimizer payload parameters:
  - `qmax`
  - `mindb`
  - `maxdb`
- Reset logic uses the canonical preset key `default`.

### API version compatibility

- Before optimization starts, the wizard checks API version support.
- If backend version is below `ROOMEQ_MINIMUM_VERSION`, a compatibility message is shown and optimization does not proceed.

## Regressions Covered by Tests

Unit/regression tests are implemented in `src/components/__tests__/RoomEqualisationWizard.test.ts` and cover:

1. Target preset preference for `flat` regardless of API order.
2. Parsing nested usable-range response and updating Step 3 inputs.
3. Displaying API compatibility error when version requirements are not met.
4. Applying selected optimizer preset values to optimization payload.
5. Resetting selected optimizer preset to `default` after closing the wizard.

## Inconsistencies Fixed

The following inconsistencies were corrected:

1. **Preset reset case mismatch**
   - Reset used `Default` while runtime options use lowercase keys.
   - Fixed to reset to `default`.

2. **Optimizer preset selection not applied**
   - Optimization payload previously used hardcoded limits.
   - Fixed to read `qmax`, `mindb`, and `maxdb` from selected preset.

3. **Recommended range precedence mismatch**
   - Logic/comment claimed recommended limits are used, but raw bounds were prioritized.
   - Fixed to prioritize `recommended_min`/`recommended_max` first.
