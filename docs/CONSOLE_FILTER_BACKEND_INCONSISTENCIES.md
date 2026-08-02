# Console Filter Backend - Purpose, Flow & Inconsistencies

## Module Purpose

The console filter backend in [src/stores/console_filter_backend.ts](src/stores/console_filter_backend.ts) is the demo backend for filter editing workflows.

It is expected to:
- back filter CRUD operations for UI/testing,
- support predefined and user-created banks,
- expose backend capabilities used by the filter connector.

## Data Flow

createFilterBank
→ ensure bank exists in local backend state

addFilter
→ validate capacity for target bank
→ create generated filter ID
→ insert filter at requested position

getBackendCapabilities
→ return bank list with max and current filter counts

## Inconsistencies Identified and Fixed

### 1. Custom banks were unusable for addFilter

Issue:
- Non-predefined bank names defaulted to max capacity `0`.
- Adding a filter to a custom bank always failed with a capacity error.

Fix:
- Added default max capacity for dynamic custom banks (`DEFAULT_MAX_FILTERS = 16`).
- Capacity checks for non-predefined banks now use that default.

### 2. Custom banks were missing from backend capabilities

Issue:
- `getBackendCapabilities()` only returned predefined banks.
- The filter connector could not validate or display custom bank capacity.

Fix:
- `getBackendCapabilities()` now appends dynamic banks from current backend state.
- Custom banks are surfaced with `filterBankType: 'custom'` and the default max capacity.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/filter-custom-banks.regression.test.ts](src/stores/__tests__/filter-custom-banks.regression.test.ts) cover:
- adding filters to custom-created banks,
- reporting custom banks in backend capabilities.

Status:
- Custom-bank regression suite passes.
- Full project suite passes after fixes.
