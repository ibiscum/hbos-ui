# DSP Toolkit Filter Backend

File: `src/stores/dsp-toolkit-filter-backend.ts`

This backend maps the generic filter store contract onto the HiFiBerry DSP Toolkit API. It discovers available filter banks from DSP metadata, reconstructs persisted filters, translates UI filters to DSP filter requests, and pushes updates to hardware/filter store persistence.

## Consistency Fixes Applied

1. **Backend name typo corrected**
- Updated `name` from `HiFiBery DSP` to `HiFiBerry DSP`.

2. **Deterministic insertion semantics**
- `addFilter` now clamps insertion position to `[0, currentLength]` and always uses `splice`.
- Negative positions now prepend instead of appending.
- This aligns behavior with other filter backend implementations.

3. **Filter ID integrity on update**
- `updateFilter` now preserves the existing filter id even when a runtime payload includes an `id` property.
- This matches the backend contract (`Partial<Omit<Filter, 'id'>>`) and prevents accidental identity corruption.

4. **Modernized id suffix generation**
- Replaced deprecated `substr` usage with `slice` in generated filter IDs.

5. **Metadata key usage during persistence**
- `storeFiltersInDSP` now prefers the bank's resolved `metadataKey` before fallback mapping.
- This avoids ambiguity if a bank's metadata mapping was discovered dynamically.

## Consolidated Unit + Regression Tests

Implemented in:
- `src/stores/__tests__/dsp-toolkit-filter-backend.test.ts`

Covered scenarios:
- metadata-driven capability discovery and sorted bank ordering (`left`, `right`, then `iir_*`)
- capability sample-rate fallback from `metadata.sampleRate` when `_system.sampleRate` is absent
- initialization failure path when DSP is unavailable
- add-filter insertion clamping and max-capacity enforcement
- update-filter id-preservation regression
- remove-filter invalid-position behavior
- stored-filter reconstruction order by offset and direct-coefficients skip behavior
- unsupported filter-type translation (`bandpass` -> transparent `Volume` filter for DSP writes)
- import behavior that clears omitted banks to avoid stale filters

## Notes

- Hardware updates are still applied as full-bank rewrites (`maxFilters` slots), clearing unused slots with transparent coefficients.
- Filter-store persistence failures are intentionally logged and non-fatal so hardware writes remain authoritative.
