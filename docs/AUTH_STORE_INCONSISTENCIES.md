# Auth Store - Purpose, Flow & Inconsistencies

## Store Purpose

The auth store in [src/stores/auth.ts](src/stores/auth.ts) manages authentication status, CSRF token state, and user-facing auth actions.

It provides a single source of truth for:
- current protection policy,
- authenticated state,
- password setup state,
- loading state during auth-related operations.

## Data Flow

Action (login/setPassword/logout/setPolicy)
→ execute API request
→ update local auth state (csrf/status)
→ refresh status from backend
→ settle loading state

## Inconsistencies Identified and Fixed

### 1. Loading state did not cover full async lifecycle for write actions

Issue:
- `loading` was only managed by `refreshStatus`.
- `login`, `setPassword`, `logout`, and `setPolicy` could be in flight while `loading` was still `false`.

Fix:
- Added a shared `withLoading` helper with in-flight operation counting.
- Wrapped `refreshStatus`, `login`, `setPassword`, `logout`, and `setPolicy` with this helper.
- Ensured `loading` remains `true` until the full action chain settles.

### 2. Nested auth calls could cause premature loading reset

Issue:
- Actions call `refreshStatus` internally.
- A simple boolean toggle can be reset by inner completion before the outer action fully finishes.

Fix:
- Introduced reference-counted loading control (`loadingOperations`) so nested calls keep `loading` true until all pending auth operations complete.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/auth.regression.test.ts](src/stores/__tests__/auth.regression.test.ts) cover:
- `login` sets `loading` while request is in flight,
- `setPassword` sets `loading` while request is in flight,
- `logout` sets `loading` while request is in flight,
- `setPolicy` sets `loading` while request is in flight.

Status:
- Auth regression suite passes.
- Full project suite passes after fixes.
