# Filter Connector Store - Purpose, Flow & Inconsistencies

## Store Purpose

The filter connector store in [src/stores/filter_connector.ts](src/stores/filter_connector.ts) manages filter-bank state and routes operations through pluggable backends (console and DSP toolkit).

It is responsible for:
- selecting the active backend,
- syncing local filter state from backend state,
- delegating filter CRUD and bulk operations,
- persisting backend preference.

## Data Flow

switchBackend
→ update active backend type
→ sync local banks from selected backend
→ persist backend preference

filter operations (add/update/remove/etc.)
→ call active backend method
→ refresh local state via syncFromBackend

## Inconsistencies Identified and Fixed

### 1. Failed backend switches left store in inconsistent state

Issue:
- `switchBackend` changed `currentBackendType` and persisted preference before verifying backend sync success.
- If sync failed (for example DSP backend unavailable), store still pointed to failed backend and persisted that invalid selection.

Fix:
- Made backend switching transactional.
- `switchBackend` now:
  1. remembers previous backend,
  2. attempts sync on the new backend,
  3. persists preference only after successful sync,
  4. rolls back to previous backend when sync fails.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/filter-connector.regression.test.ts](src/stores/__tests__/filter-connector.regression.test.ts) cover:
- failed switch to unavailable DSP backend keeps previous backend,
- failed backend switch does not persist backend selection.

Status:
- Filter connector regression suite passes.
- Full project suite passes after fixes.
