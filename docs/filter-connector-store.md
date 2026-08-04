# Filter Connector Store

## Scope

The filter connector store coordinates all filter operations and delegates persistence/IO to the active backend.

Source file:
- `src/stores/filter-connector.ts`

It is responsible for:
- backend selection and persistence
- syncing local state from backend snapshots
- delegating add/update/remove/import/export operations
- convenience operations (move, copy, bulk update, pattern/type queries)

## Consistency Fixes Applied

1. Dynamic-bank add flow alignment
- `canAddFilterToBank(bankName)` now returns `true` when the bank is not explicitly listed in backend capabilities.
- This allows backends that support dynamic bank creation (for example, console backend) to create banks on first add.

2. Add pre-check behavior
- `addFilter` now enforces pre-capacity checks only when the target bank is explicitly present in backend capabilities.
- Unknown banks are delegated to backend behavior instead of being blocked prematurely.

3. Interface alias alignment
- Updated store signatures to align with interface aliases:
  - `addFilter(..., filter: NewFilter)`
  - `updateFilter(..., updates: FilterUpdate)`
  - `bulkUpdateFilter(..., updates: FilterUpdate)`

## Consolidated Unit + Regression Tests

Implemented in:
- `src/stores/__tests__/filter-connector.test.ts`

Coverage includes:
- stored backend preference initialization
- DSP auto-selection and persistence when available
- rollback behavior when backend switch fails
- no persistence on failed backend switch
- dynamic bank allowance in `canAddFilterToBank`
- add-to-custom-bank without pre-creating bank (regression)
- known-bank capacity enforcement
- copy and move operation behavior within a bank

Consolidation note:
- Previous custom-bank-only test file was merged into the connector suite for a single source of truth.

## Notes

- The connector intentionally keeps backend-specific constraints in backend implementations.
- Connector-level pre-checks should avoid rejecting operations that a backend can validly handle.
