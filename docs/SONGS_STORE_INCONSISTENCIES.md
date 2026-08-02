# Songs Store - Purpose, Flow & Inconsistencies

## Store Purpose

The songs store in [src/stores/songs.ts](src/stores/songs.ts) provides song-list and song-detail state for UI flows.

Current implementation is mock-backed and timer-based, and is used to:
- expose reactive loading state,
- provide a song list (`songs`),
- provide a selected song (`song`),
- emulate async latency during fetch actions.

## Data Flow

### 1. Song list flow

`getSongs()`
→ set `loading = true`
→ wait fixed mock delay
→ set `songs` from mock source
→ set `loading = false`
→ resolve operation

### 2. Song detail flow

`getSongById(id)`
→ set `loading = true`
→ wait fixed mock delay
→ find song by `id` in mock source
→ set `song` to matched value or `null`
→ set `loading = false`
→ resolve operation

## Inconsistencies Identified and Fixed

### 1. `getSongById` ignored input ID

**Issue:** The action always returned a constant mock song regardless of requested id.

**Fix:** It now searches the mock song list by `id` and returns a matched copy, otherwise `null`.

### 2. Shared mutable array reference in `getSongs`

**Issue:** `songs` was assigned to the original mock array reference, allowing caller mutation to leak into future loads.

**Fix:** `getSongs` now assigns a copied array with copied objects.

### 3. Debug console output in store action

**Issue:** `getSongById` logged request data via console in normal action path.

**Fix:** Removed debug log from action.

### 4. Delay value duplicated

**Issue:** Delay constant was hard-coded in multiple locations.

**Fix:** Introduced `MOCK_DELAY_MS` constant and reused it.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/songs.regression.test.ts](src/stores/__tests__/songs.regression.test.ts).

Covered behaviors:
- initialization defaults,
- loading state transition for list/detail actions,
- list fetch result population,
- independent list copy behavior,
- id-aware song lookup,
- missing-id handling (`song = null`).

Status:
- Songs regression suite passes.
- Full project test suite passes after fixes.
