# Chart Paths Composable

## File

- `src/composables/useChartPaths.ts`

## Purpose

`useChartPaths` provides shared chart coordinate conversion and SVG path generation for frequency response and target curves.

Exports:

- `CHART_CONFIGS`: predefined chart dimensions and axes for wizard steps.
- `frequencyToX(freq, config)`: maps frequency (log scale) to SVG X.
- `magnitudeToY(mag, config)`: maps magnitude (linear, inverted) to SVG Y.
- `generateFrequencyPath(frequencies, magnitudes, config)`: creates a polyline path for measured/response curves.
- `generateTargetCurvePath(points, config, clipMinFreq?, clipMaxFreq?)`: creates a clipped target-curve path with interpolation at boundaries.

## Behavior Contract

1. `generateFrequencyPath` returns an empty string when either input array is empty.
2. `generateFrequencyPath` uses only paired array entries (`min(length(frequencies), length(magnitudes))`).
3. `generateFrequencyPath` ignores non-finite values and out-of-range frequencies.
4. `generateTargetCurvePath` returns an empty string when there are no usable points, or when clip bounds collapse the visible range.
5. `generateTargetCurvePath` ignores invalid points (non-finite `frequency`/`target_db`).
6. `generateTargetCurvePath` clips to chart bounds, and optionally to caller clip bounds, interpolating the boundary values.
7. Non-finite clip bounds are treated as unset.

## Inconsistencies Fixed

1. Mismatched frequency/magnitude arrays previously produced `NaN` path segments.
- Fix: iterate only across paired entries and skip non-finite values.

2. Target clipping used hard-coded `20`/`25000` limits in addition to chart config.
- Fix: clamp only against the active chart config (plus optional caller clip bounds).

3. Invalid target points could flow into path generation and produce unstable output.
- Fix: filter to finite numeric points before sorting and clipping.

## Tests

- `src/composables/__tests__/useChartPaths.test.ts`

Coverage includes:

1. Coordinate boundary mapping for `frequencyToX` and `magnitudeToY`.
2. Frequency path generation with range filtering and invalid-value rejection.
3. Regression for mismatched arrays and NaN prevention.
4. Target curve boundary interpolation at chart edges.
5. Regression for invalid target points and non-finite clip bounds.
6. Guard for collapsed clip ranges.
