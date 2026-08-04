# Console Filter Backend

## Scope

The `ConsoleFilterBackend` is an in-memory demo backend for filter workflows.
It is used to exercise filter UI and store behavior without hardware I/O.

## Behavior Summary

- Predefined banks are created on startup: `left`, `right`, `A`, `B`, `C`, `D`.
- Predefined banks have fixed type metadata:
  - `left`, `right` => `speaker-equalizer`
  - `A`, `B`, `C`, `D` => `crossover-designer`
- Capacity is enforced per bank:
  - predefined banks: 16 filters max
  - dynamic custom banks: 16 filters max (default)
- Filter IDs are generated sequentially as `filter_<n>`.
- Export/import and current-config methods return deep-cloned snapshots.

## Consistency Fixes

### Corrected limit descriptions

Documentation comments and backend description were aligned with real behavior:
- old wording implied 4 filters per channel
- actual limit is 16 filters per bank

### Capacity helper behavior aligned with add behavior

`canAcceptMoreFilters(bankName)` now returns `true` for non-existing banks when default capacity allows adding filters.
This matches `addFilter()`, which auto-creates banks via `ensureBankExists()`.

### Snapshot cloning consistency

`exportFilterConfig()`, `importFilterConfig()`, and `getCurrentConfig()` now share the same cloning path for consistent snapshot semantics.

## Regression and Unit Tests

Implemented and consolidated in:
- `src/stores/__tests__/console-filter-backend.regression.test.ts`

Coverage includes:
- predefined initialization and capabilities metadata
- insertion clamping and sequential id generation
- predefined and custom capacity enforcement
- update/remove/clear semantics
- deep clone guarantees for exported/current config
- import id-cursor regression (`nextFilterId` after imported max id)
- remove-bank status behavior and reset-all restore path
