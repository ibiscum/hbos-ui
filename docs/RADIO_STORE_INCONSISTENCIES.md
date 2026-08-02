# Radio Store - Purpose, Flow & Inconsistencies

## Store Purpose

The radio store in [src/stores/radio.ts](src/stores/radio.ts) manages:
- station search through Radio Browser APIs,
- favorite station persistence and migration,
- playback orchestration into the configured player,
- helper parsing for M3U playlist URLs.

## Data Flow

### 1. Search flow

search(query)
→ trim/validate input
→ request stations by name from selected Radio Browser server
→ map server payload into UI station model
→ mark `isFavorite` based on current favorite record
→ update `searchResults`, `loaded`, and `loading`

### 2. Favorite flow

addToFavorites/removeFromFavorites/toggleFavorite/editFavorite
→ mutate `favorites`
→ synchronize `isFavorite` flags in current `searchResults`
→ persist via config key `ui.radiostations`

### 3. Playback flow

playStation(station)
→ resolve configured radio player name from app config
→ optionally parse M3U URL into final stream URL
→ pause active player
→ clear configured radio player queue
→ add radio stream with metadata
→ send play command

### 4. Initialization flow

initialize()
→ load app config
→ load and migrate favorites from config backend
→ determine and cache Radio Browser base URL

## Inconsistencies Identified and Fixed

### 1. Search failure left stale loaded state

Issue:
- On search errors, results were cleared but `loaded` was not reset, leaving stale success state from previous searches.

Fix:
- Set `loaded = false` in search catch path.

### 2. Playback used outdated appconfig getter API

Issue:
- `playStation()` called `configStore.radioPlayer()` as a function.
- Appconfig now exposes `radioPlayer` as a property/computed value, causing runtime TypeError.

Fix:
- Added compatibility resolution:
  - if `radioPlayer` is a function, call it,
  - otherwise use property value,
  - fallback to `mpd`.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/radio.regression.test.ts](src/stores/__tests__/radio.regression.test.ts) cover:
- initial state defaults,
- favorite add/remove/toggle plus persistence call,
- search mapping and favorite annotation,
- search failure state reset,
- playback orchestration with configured player and queue commands.

Status:
- Radio regression suite passes.
- Full test suite passes after fixes.
