# DSP Toolkit Filter Backend - Purpose, Flow & Inconsistencies

## Module Purpose

The DSP toolkit filter backend in [src/stores/dsp_toolkit_filter_backend.ts](src/stores/dsp_toolkit_filter_backend.ts) manages DSP-backed filter-bank CRUD and synchronizes filter state to DSP hardware/filter-store persistence.

It is responsible for:
- maintaining filter-bank topology from metadata,
- applying config imports/exports,
- propagating filter changes to DSP hardware.

## Data Flow

importFilterConfig
→ validate imported bank capacities
→ update in-memory bank filter state
→ push updated banks to DSP hardware

getCurrentConfig
→ initialize backend (if needed)
→ export normalized filter-bank state

## Inconsistencies Identified and Fixed

### 1. Partial imports left stale filters in omitted existing banks

Issue:
- `importFilterConfig` only overwrote banks included in imported config.
- Existing banks omitted from import kept previous filters, causing stale state after partial imports.

Fix:
- Import now starts from existing topology with cleared filters.
- Provided banks are then populated from imported config.
- Omitted existing banks remain present but with empty filter lists.
- Existing bank metadata/capacity fields are preserved.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/dsp-toolkit-filter-backend.regression.test.ts](src/stores/__tests__/dsp-toolkit-filter-backend.regression.test.ts) cover:
- importing a subset of banks clears filters in omitted existing banks rather than preserving stale entries.

Status:
- DSP toolkit filter backend regression suite passes.
- Full project suite passes after fixes.
