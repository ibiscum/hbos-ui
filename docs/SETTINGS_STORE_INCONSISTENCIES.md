# Settings Store - Purpose, Flow & Inconsistencies

## Store Purpose

The settings store in [src/stores/settings.ts](src/stores/settings.ts) manages UI/service preferences and room-measurement persistence:
- UI flags: expert mode, vu-meter enabled
- Service preferences: Last.fm and Spotify toggles
- Hardware gating: Raspberry Pi version detection (`isPi5OrHigher`)
- RoomEQ measurement persistence via config backend

## Data Flow

### 1. UI settings persistence flow

`loadSettings()`
→ read persisted values from localStorage
→ merge service settings and boolean flags when valid
→ fetch system info for Pi version
→ set `loaded` and clear `loading`

`saveSettings()`
→ persist service settings + UI flags to localStorage
→ clear `loading` in finally

### 2. Service toggle flow

`updateLastfmSettings` / `updateSpotifySettings` / `updateExpertMode`
→ mutate settings
→ call `saveSettings()`

`updateVuMeterEnabled(enabled)`
→ mutate local setting and save
→ call backend `enableService`/`disableService`

### 3. Room measurement flow

`getRoomMeasurements()`
→ list keys by prefix `roomeq.measurement.`
→ fetch each value
→ parse and validate entries
→ return measurements sorted by id

`saveRoomMeasurement(...)`
→ load existing measurements
→ compute next numeric id safely
→ save JSON payload under `roomeq.measurement.{id}`

`deleteRoomMeasurement(id)`
→ delete backend key

## Inconsistencies Identified and Fixed

### 1. Persisted boolean flags accepted invalid runtime types

**Issue:** `loadSettings()` directly assigned parsed values for `expertMode` and `vuMeterEnabled`, allowing strings/numbers to enter boolean state.

**Fix:** Added `typeof parsed === 'boolean'` guards before assignment.

### 2. Non-string measurement keys could break full measurement loading

**Issue:** `getRoomMeasurements()` called `startsWith` on every key without checking type, so a non-string key threw and short-circuited the whole load.

**Fix:** Added string type guard and skip invalid keys.

### 3. Next measurement ID could become `NaN`

**Issue:** `saveRoomMeasurement()` used `Math.max(...ids)` without validating IDs; malformed existing entries could produce `NaN` and save to `roomeq.measurement.NaN`.

**Fix:** Filter existing IDs to finite positive numbers, fallback to `1` when none are valid.

### 4. Excess console noise in normal store paths

**Issue:** Several success/info logs were emitted in routine store operations.

**Fix:** Removed non-essential console logs from settings and room-measurement success paths.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/settings.regression.test.ts](src/stores/__tests__/settings.regression.test.ts) cover:
- initialization and load defaults,
- persisted boolean type safety,
- vu-meter backend toggle behavior,
- robust room measurement key parsing,
- safe measurement ID generation,
- measurement delete key behavior.

Status:
- Settings regression suite passes.
- Full test suite passes after fixes.
