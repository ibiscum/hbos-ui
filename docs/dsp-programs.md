# DSP Programs View

## Overview

The DSP Programs service view presents:

- DSP availability state (hardware/software detection)
- Installed profile summary (cache metadata + current program checksum)
- Compatible profile catalog for the detected sound card
- Profile deployment flow with confirmation and result feedback

Source: `src/views/services/dsp-programs.vue`

## Data Flow

On mount, the view loads these resources in parallel:

1. `detectSoundCard()`
2. `dspToolkitStore.checkDSPStatus()`
3. `getMetadata()`
4. `getCacheStatus()` guarded by `dspToolkitStore.canUseDSP()`
5. `getDSPProfilesMetadata()` guarded by `dspToolkitStore.canUseDSP()`
6. `getDSPProgramChecksum()` guarded by `dspToolkitStore.canUseDSP()`

If DSP software/hardware is unavailable, the view renders an informational card and skips profile interactions.

## Compatibility Filtering

The profile list is filtered by normalized model mapping from detected sound-card name:

- `beocreate` -> `Beocreate 4-Channel Amplifier`
- `dac+ dsp` variants -> `DAC+ DSP`
- `dac2` variants -> `DSP add-on`

Only profiles with a matching `modelName` are shown when a model is detected.

## Deployment UX Contract

- Clicking an installed profile opens an informational modal and does not perform deployment.
- Clicking a non-installed profile opens a confirmation modal.
- Confirm deploy calls `updateDSPProfile({ file })`, preferring `_system.filepath` with filename fallback.
- On success/failure, the same modal displays the result.
- Confirming a result dialog closes it.

## Consistency Fixes Applied

The following inconsistencies were corrected in the view:

- Fixed invalid icon prop usage (`name` -> `icon`) for the DSP unavailable state icon.
- Fixed installed-profile comparison to use checksum string equality.
- Fixed modal state lifecycle when opening profiles to avoid stale selection/result data.
- Fixed result-dialog confirm behavior to close modal correctly even when no profile is selected.
- Aligned styles with template semantics (`profiles-header h2` selector).

## Tests

Consolidated unit + regression tests are implemented in:

- `src/views/services/__tests__/dsp-programs.test.ts`

Coverage includes:

- Render and model-specific heading behavior
- Installed profile information table
- Hardware compatibility filtering
- Empty-state behavior for incompatible profile sets
- DSP backend error state rendering
- Installed-profile modal close regression
- Deployment API invocation and post-deploy refresh behavior
- Network error messaging in deployment failures
