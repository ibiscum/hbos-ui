# Filter Backend Interface - Purpose, Contract & Inconsistencies

## Module Purpose

The filter backend interface in [src/stores/filter_backend_interface.ts](src/stores/filter_backend_interface.ts) defines the shared contract for all filter backend implementations.

It provides the common type model and required operations for:
- filter CRUD,
- filter-bank lifecycle,
- import/export,
- backend capabilities metadata used by UI/backend selection surfaces.

## Contract Flow

Concrete backend implementation
→ extends FilterBackend abstract class
→ returns BackendCapabilities payload
→ filter connector/views consume normalized backend metadata fields

## Inconsistencies Identified and Fixed

### 1. Abstract backend contract did not require short description

Issue:
- `BackendCapabilities` requires `backendShortDescription`, and UI surfaces consume it.
- `FilterBackend` abstract contract did not require a `shortDescription` field.
- This allowed backend implementations to omit a local short description source.

Fix:
- Added `abstract readonly shortDescription: string` to `FilterBackend`.
- Concrete backends now have an explicit compile-time contract for short descriptions.

### 2. HTTP backend could return capabilities without backendShortDescription

Issue:
- `HttpFilterBackend.getBackendCapabilities()` previously returned server payload as-is.
- If the server omitted `backendShortDescription`, runtime data violated the interface contract.

Fix:
- `HttpFilterBackend.getBackendCapabilities()` now normalizes payload fields.
- Added fallback for `backendShortDescription` to backend name when missing.
- Also normalizes required fields to safe defaults when omitted.

## Regression Test Coverage

Regression tests in [src/stores/__tests__/http-filter-backend.regression.test.ts](src/stores/__tests__/http-filter-backend.regression.test.ts) cover:
- path-segment encoding for bank-name endpoints,
- fallback behavior when capabilities omit `backendShortDescription`.

Status:
- Targeted HTTP filter backend regression tests pass.
- Full project test suite passes after fixes.
