# Favourites Info Composable

## File

- src/composables/useFavouritesInfo.ts

## Purpose

useFavouritesInfo loads favourites-provider metadata for system diagnostics and UI status rendering.

It provides:

- reactive request state (loading, error)
- latest fetched provider payload (favouritesInfo)
- pure helpers for provider status label/class mapping

## API

- state:
- loading
- error
- favouritesInfo

- methods:
- getFavouritesInfo(): Promise<FavouritesInfo | null>
- getProviderStatusText(provider): string
- getProviderStatusClass(provider): string

## Behavior Contract

1. getFavouritesInfo fetches from /favourites/providers.
2. On success, favouritesInfo is updated and error is cleared.
3. On fetch-level failures, favouritesInfo is reset to null and error is set to:
- Failed to fetch favourites info: <details>
4. On thrown runtime failures, the same formatted error contract is used.
5. If the request succeeds but data is empty/null, favouritesInfo is reset to null and error is set to No data received.
6. Provider status helpers map state consistently:
- disabled -> Disabled / status-disabled
- enabled but inactive -> Enabled (Inactive) / status-inactive
- enabled and active -> Active / status-active

## Inconsistencies Fixed

1. Stale favourites data after failed refreshes.
- Before: a failed or empty response could leave previous favouritesInfo visible.
- Now: favouritesInfo is cleared for all failure and empty-data paths.

2. Error message formatting differed between failure paths.
- Before: catch-path messages did not match fetch-error formatting.
- Now: all failure paths use Failed to fetch favourites info: <details> for consistency.

## Tests

- src/composables/__tests__/useFavouritesInfo.test.ts

Coverage includes:

1. Successful load path with reactive state updates.
2. Regression: stale-state clearing after fetch error.
3. Object-shaped fetch error serialization.
4. Regression: stale-state clearing on null/empty data.
5. Thrown error path with consistent message contract.
6. Provider status label/class mapping for all state combinations.
