# Library Genres View

## Scope

src/views/library/genres.vue renders the genres grid in the music library and routes users to the genre albums view.

## Inconsistencies Fixed

- Hardened async loading flow so loading state is always cleared on success and failure.
- Added catch-all error handling for thrown failures from library resolution or genre fetch.
- Normalized non-string API error payloads to Unknown error for stable toast copy.
- Aligned genre-view toast text with page semantics (Failed to load genres).

## Consolidated Tests

src/views/library/__tests__/genres.test.ts combines unit and regression coverage for:

- Mount-time loading behavior and endpoint contract (/library/:activeLibrary/categories).
- Call ordering (getAvailableLibrary before genre fetch).
- Loading skeleton visibility while request is pending.
- Rendering genre cards from API response.
- Navigation to albums-by-genre with correct route param on click.
- Empty-state rendering when API returns no genres.
- Toast behavior for API error refs.
- Regression protection for thrown errors to ensure loading state is always cleared.

## Why This Matters

Without explicit throw handling, a failed load can leave the view in perpetual loading state. The updated implementation and tests guarantee deterministic behavior for success and failure paths while preserving endpoint compatibility with the backend categories payload.
