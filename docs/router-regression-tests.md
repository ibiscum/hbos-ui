# Router Regression and Unit Tests

This document summarizes consolidated test coverage for the app router.

## Scope

Primary implementation under test:
- src/router/index.ts

Primary test suite:
- src/router/__tests__/index.test.ts

## What is covered

### Route definitions and wiring

- Critical route presence and path assertions:
  - `setup` -> `/setup`
  - `playlist` -> `/playlist`
  - `artist-album` -> `/library/albums/artist/:artistId`
- `/playlist` still loads the queue wrapper and delegates to the playlist view.
- Unknown routes still fall back to `/` and then resolve to `now-playing`.

### Setup flow guard behavior

- Global guard skips setup checks for `setup` and `setup-restart`.
- First guarded navigation checks setup status via `getSetupStatus()`.
- Incomplete setup redirects to `setup`.
- Completed setup allows navigation to protected routes.
- API failure in setup status check defaults to allowing navigation (non-blocking UI behavior).
- Guard check result is cached after first evaluation.
- `markSetupCompleted()` forces setup-complete state and bypasses API status checks.

### Setup restart route behavior

- `setup-restart` route guard calls `resetSetup()`.
- Regardless of `resetSetup()` success/failure, navigation result redirects to `setup`.
- After restart guard runs, subsequent guarded navigation redirects to setup without refetching setup status.

## Consistency fix made in router

A path consistency issue in nested library routes was corrected:

- `artist-album` route path changed from absolute child path `/artist/:artistId`
- to relative nested child path `artist/:artistId`

This aligns it with sibling nested routes and yields the canonical nested URL:
- `/library/albums/artist/:artistId`

## Why consolidation was done

Previously router coverage existed as a single-purpose playlist route test. Coverage is now consolidated into one router-focused suite so route definitions, guard logic, and regression behavior are validated together and maintained in one place.
