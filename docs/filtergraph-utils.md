# Filter Graph Utilities

## Scope

Utility functions for filter graph visualization live in:
- `src/utils/filtergraph.ts`

The module provides:
- frequency/gain coordinate conversions
- single/combined filter response sampling
- SVG path generation
- grid/label generation helpers

## Consistency Fixes Applied

1. Invalid range guards
- Added normalization helpers so frequency and gain ranges are never degenerate.
- Prevents divide-by-zero and `NaN`/`Infinity` propagation when callers pass bad bounds.

2. Plot dimension sanitization
- Coordinate transforms now sanitize width/height to a positive fallback.
- Prevents unstable output when dimensions are zero or non-finite.

3. Input clamping for transforms
- Frequency, X, gain, and Y inputs are clamped into valid ranges.
- Keeps conversions deterministic for out-of-range and non-finite inputs.

4. Stable point count handling
- Response generators normalize `numPoints` to at least one interval.
- Ensures consistent output shape and avoids empty/invalid loops.

## Consolidated Unit + Regression Tests

Implemented in:
- `src/utils/__tests__/filtergraph.test.ts`

Coverage includes:
- frequency and gain transform round-trips
- invalid/range-edge guard behavior (`NaN`/degenerate input hardening)
- coordinate mapping for point arrays
- single and combined response generation semantics
- enabled-filter-only aggregation in combined responses
- SVG line/area path generation and closure behavior
- graph-data wrapper behavior for enabled/disabled filters
- frequency/gain grid and label generation characteristics

## Notes

- The helpers intentionally return finite values for invalid caller input rather than throwing.
- This keeps graph rendering resilient in interactive UI flows where transient invalid values may occur.
