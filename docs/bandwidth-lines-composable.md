# Bandwidth Lines Composable

## File

- `src/composables/useBandwidthLines.ts`

## Purpose

`useBandwidthLines` exposes two computed values for the active filter:

- `activeFilterBandwidthStart`
- `activeFilterBandwidthEnd`

These values define the lower and upper frequency boundaries used to render bandwidth guide lines in the filter graph.

## Behavior Contract

1. The composable returns `null` for both boundaries when:
- the filter type is `generic_normalized`
- `Q` is missing, non-numeric, or not greater than `0`
- `frequency` is not greater than `0`

2. For supported biquad types, the composable computes a single shared bandwidth object and derives start/end from it:
- `peaking`
- `lowshelf`
- `highshelf`
- `lowpass`
- `highpass`

3. For unexpected runtime icon values, the composable falls back to `peaking` behavior for backward compatibility.

## Inconsistencies Fixed

The implementation was reviewed and normalized in two areas:

1. Removed duplicate computation paths for start/end.
- Before: start and end each created a biquad and computed bandwidth independently.
- Now: one shared computed bandwidth is reused by both outputs.

2. Fixed type mapping inconsistency.
- Before: `lowpass` and `highpass` were implicitly treated as `peaking`.
- Now: both map to their native biquad types before calling `calculateBiquadBandwidth`.

## Tests Added

- `src/composables/__tests__/useBandwidthLines.test.ts`

Coverage includes:

1. `generic_normalized` short-circuit returns `null` and does not call biquad helpers.
2. Invalid parameter guards for `Q` and `frequency`.
3. Filter type mapping, including regression coverage for `lowpass` and `highpass`.
4. Shared-computation regression check: reading start and end for the same state performs one bandwidth calculation.
5. Reactive recomputation when the active filter changes.
