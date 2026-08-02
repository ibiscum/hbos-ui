# Library Store - Purpose, Flow & Inconsistencies

## Store Purpose

The library store in [src/stores/library.ts](src/stores/library.ts) is the source of truth for:
- discovering and selecting the active music library player,
- tracking whether the selected library is fully loaded,
- exposing delete capability support for the active backend,
- fetching and exposing aggregated library statistics,
- building album cover URLs for the active library.

It is a foundational dependency for other data stores that use `:activeLibrary` routes.

## Data Flow

### 1. Library selection flow

`getAvailableLibrary()`
→ fetch `/library` from API base URL
→ choose first player with `has_library && is_loaded`
→ fallback to first player with `has_library`
→ update `activeLibrary`, `isLibraryLoaded`, `supportsDelete`
→ return selected library name (or `null`)

### 2. Library status refresh flow

`refreshLibraryStatus()`
→ no-op when `activeLibrary` is not set
→ fetch `/library`
→ find current player by `player_name`
→ update `isLibraryLoaded`

### 3. Statistics flow

`fetchLibraryStats()`
→ set stats loading true and clear previous error
→ call `getAllLibraryStats()`
→ set `libraryStats` on success
→ set `libraryStatsError` on failure
→ always clear loading

### 4. Cover URL flow

`getAlbumCover(id)`
→ when `activeLibrary` exists, compose `{apiBase}/library/{activeLibrary}/image/album:{id}`
→ when missing, return empty string

## Inconsistencies Identified and Fixed

### 1. Loading flag could stay stuck on thrown request errors

**Issue:** `getAvailableLibrary()` set `loading = true` but lacked `try/finally`, so thrown errors could leave loading permanently true.

**Fix:** Wrapped logic with `try/finally` and guaranteed `loading = false` in `finally`.

### 2. Unsafe album cover URL when no active library

**Issue:** `getAlbumCover()` generated URLs containing `/library/null/...` when `activeLibrary` was unset.

**Fix:** Added guard to return empty string when no active library is selected.

### 3. Debug logging and warning noise in store action path

**Issue:** Production store action contained console debug/warn logging that added noise and made tests brittle.

**Fix:** Removed debug/warn logs from `getAvailableLibrary()` and `refreshLibraryStatus()`.

### 4. Refresh status path lacked failure isolation

**Issue:** `refreshLibraryStatus()` could throw and bubble unexpectedly.

**Fix:** Added defensive `try/catch` to keep existing state unchanged on refresh failure.

## Regression Test Coverage

Regression tests were added in [src/stores/__tests__/library.regression.test.ts](src/stores/__tests__/library.regression.test.ts).

Covered areas:
- initialization defaults and computed getters,
- library selection preference/fallback/empty cases,
- API error and thrown-error handling in `getAvailableLibrary()`,
- refresh behavior with and without active library,
- stats success and failure flows,
- cover URL composition and no-library guard.

Status:
- Library regression suite passes.
- Full test suite passes after fixes.
