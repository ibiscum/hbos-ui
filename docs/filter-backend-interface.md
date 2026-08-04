# Filter Backend Interface

## Scope

The filter backend interface defines the shared contract that all filter backends implement:
- in-memory demo backend
- DSP toolkit backend
- HTTP backend

Source file:
- `src/stores/filter-backend-interface.ts`

## Contract Summary

Core data model:
- `Filter`: persisted filter representation including backend-assigned `id`
- `FilterBank`: named list of filters
- `FilterBanks`: dictionary of filter banks by name
- `FilterBankInfo`: capability metadata for one bank
- `BackendCapabilities`: backend identity and available banks

Abstract backend operations (`FilterBackend`):
- capabilities discovery
- add/remove/update filters
- clear/create/remove banks
- import/export/get-current configuration snapshots

## Consistency Fixes

Applied in `src/stores/filter-backend-interface.ts`:

1. Added reusable aliases for payload consistency
- `NewFilter = Omit<Filter, 'id'>`
- `FilterUpdate = Partial<NewFilter>`

2. Updated abstract method signatures to use aliases
- `addFilter(..., filter: NewFilter)`
- `updateFilter(..., updates: FilterUpdate)`

3. Cleaned interface documentation wording
- clarified `Filter` and `FilterBank` descriptions
- removed ambiguous grammar in comments

## Consolidated Unit + Regression Tests

Implemented in:
- `src/stores/__tests__/filter-backend-interface.test.ts`

Coverage includes:
- type alias alignment regression (`NewFilter`, `FilterUpdate`)
- capability metadata shape/fields from a contract backend implementation
- insertion clamping and unique id assignment behavior
- id preservation on update when runtime payload includes an `id`
- invalid remove/update position status semantics
- export/current snapshot isolation (no mutable aliasing)

## Notes

The interface file itself contains types and an abstract class. Runtime behavior is validated through a minimal in-test backend implementation that exercises the contract end-to-end.
