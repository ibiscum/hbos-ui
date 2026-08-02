# Playlist Store - Purpose, Flow & Inconsistencies

## Store Purpose

The playlist store in [src/stores/playlist.ts](src/stores/playlist.ts) is responsible for queue state:
- Fetching the active library queue from `/player/:activeLibrary/queue`
- Exposing reactive queue data for queue/playlist views
- Managing queue loading status for UI rendering
- Reporting queue-fetch failures through toast notifications

## Data Flow

### 1. Queue refresh flow

`fetchQueue()`
→ set `loading = true`
→ request queue via `useLibraryFetch`
→ on success with valid array: replace `queue`
→ on API error or malformed payload: clear `queue` and report toast
→ on thrown request failure: clear `queue` and report fallback toast
→ always set `loading = false` in `finally`

### 2. Consumer flow

Queue-oriented views and websocket-driven refresh paths call `fetchQueue()` and read:
- `loading` for skeleton/progress state
- `queue` for current item list rendering

## Inconsistencies Identified and Fixed

### 1. Missing runtime validation for queue payload shape

**Issue:** Previous logic accepted any truthy `data.value.queue`, so malformed payloads (for example, a string) could be written into `queue`.

**Fix:** Added `Array.isArray(data.value?.queue)` check and explicit malformed-payload branch that clears queue and shows a specific toast.

### 2. Loading cleanup not protected by finally

**Issue:** Loading reset was outside `try/catch`, which is easier to regress during future edits.

**Fix:** Moved `loading = false` into `finally` for guaranteed cleanup.

### 3. Console error noise in store action path

**Issue:** Errors were duplicated in console and toast handling, adding noise without user value.

**Fix:** Removed console error logging from store action path while keeping toast-based error reporting.

### 4. Queue assignment shared response array reference

**Issue:** Queue state directly reused response array reference, making unintended external mutation more likely.

**Fix:** Store now assigns a shallow copy (`queue.value = [...data.value.queue]`).

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/playlist.regression.test.ts](src/stores/__tests__/playlist.regression.test.ts) cover:
- initial state defaults
- successful queue load
- API error handling and queue reset
- missing queue field behavior
- malformed queue payload guard
- thrown-request error path
- request endpoint correctness

Status:
- Playlist regression suite passes.
- Full project test suite passes after fixes.
