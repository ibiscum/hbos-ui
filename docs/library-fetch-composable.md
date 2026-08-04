# Library Fetch Composable

## File

- `src/composables/useLibraryFetch.ts`

## Purpose

`useLibraryFetch` creates a VueUse `createFetch` instance that:

1. Uses the app-configured API base URL.
2. Resolves the active library from the library store when needed.
3. Rewrites `:activeLibrary` placeholders in request URLs before a request is sent.

This keeps call sites simple and consistent across stores and views.

## Behavior Contract

1. The composable configures `createFetch` with:
- `baseUrl` from `useAppConfigStore().getApiBaseUrl()`
- `combination: 'overwrite'`

2. On each request, `beforeFetch` ensures library context:
- If `libraryStore.isAvailableLibrary` is `false`, it awaits `libraryStore.getAvailableLibrary()`.
- If library resolution throws, it cancels the request and leaves the URL unchanged.

3. URL token replacement:
- Replaces `:activeLibrary` case-insensitively.
- Supports boundary forms at end-of-path, before `/`, and before `?`.

4. Safety guard:
- If `libraryStore.activeLibrary` is still missing after initialization, the request is canceled and URL replacement is skipped.

## Inconsistencies Fixed

The implementation was reviewed and normalized in three areas:

1. Import style consistency:
- Before: imported `useLibraryStore` via `@/stores/library.ts`.
- Now: imports via `@/stores/library` like other store imports in the same file.

2. Error message accuracy:
- Before: catch block logged `Active player name failed:` which did not match the actual operation.
- Now: logs `Active library resolution failed:`.

3. Null library regression handling:
- Before: if `getAvailableLibrary()` returned no active library, URL replacement could produce `null` path segments.
- Now: missing active library triggers cancellation and preserves the original URL.

## Tests Added

- `src/composables/__tests__/useLibraryFetch.test.ts`

Coverage includes:

1. Factory configuration (`baseUrl`, `combination`, and `beforeFetch` registration).
2. Standard placeholder replacement when library is already available.
3. Lazy library initialization before replacement.
4. Case-insensitive token replacement and boundary handling.
5. Cancellation behavior when library lookup throws.
6. Regression check for missing active library after initialization.
