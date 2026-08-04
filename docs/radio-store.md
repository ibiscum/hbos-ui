# Radio Store

## Scope

The radio store manages:
- station search via Radio-Browser
- favorite station persistence/migration
- stream URL preprocessing for M3U playlists
- playback orchestration through player APIs

Source file:
- `src/stores/radio.ts`

## Consistency Fixes Applied

1. Empty-query search behavior
- `search('   ')` now clears previous results and resets `loaded=false`.
- This avoids stale UI results when users clear the search box.

2. Radio-Browser server fallback hardening
- `setRadioBrowserBaseUrl()` now falls back to `https://de2.api.radio-browser.info` when the server list endpoint returns an empty/invalid list.
- Previously, an empty list could silently leave a stale/default server without explicit fallback.

3. Favorites config parsing validation
- `loadFavoritesFromConfig()` now validates that parsed favorites payload is an object record.
- Malformed payloads (for example arrays) are rejected and favorites are reset safely.

## Consolidated Unit + Regression Tests

Implemented and consolidated in:
- `src/stores/__tests__/radio.test.ts`

Coverage includes:
- initial empty state
- add/remove/toggle favorite state updates and persistence
- search mapping and favorite flag propagation
- search failure and blank-query reset behavior
- M3U parser success and fallback behavior
- legacy favorites migration into metadata structure
- malformed favorites payload reset behavior
- radio-browser base URL selection from cached URL and fallback on empty server list
- playback orchestration with normal URL and parsed M3U URL

## Notes

- Radio-Browser requests intentionally use direct `fetch` because they target external/public hosts.
- M3U parsing intentionally goes through backend `apiFetch` endpoint (`/m3u/parse`) for controlled parsing and timeout handling.
