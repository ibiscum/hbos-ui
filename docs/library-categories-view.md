# Library Categories View

## Scope

`src/views/library/categories.vue` renders the categories grid in the music library and routes users to the category albums view.

## Inconsistencies Fixed

- Corrected empty-state wording from genre mappings to category mappings.
- Hardened async loading flow so all failure paths clear loading state.
- Added catch-all error handling for thrown exceptions from library resolution or category fetch.
- Normalized non-string API error payloads to `Unknown error` for consistent toast output.

## Consolidated Tests

`src/views/library/__tests__/categories.test.ts` now combines unit and regression coverage for:

- Mount-time loading behavior and endpoint call contract (`/library/:activeLibrary/categories`).
- Call ordering (`getAvailableLibrary` before category fetch).
- Loading skeleton visibility while request is pending.
- Rendering category cards from API response.
- Navigation to `albums-by-category` with correct route param on click.
- Empty-state rendering when API returns no categories.
- Toast behavior for API error refs.
- Regression protection for thrown errors to ensure loading state is always cleared.

## Why This Matters

Without explicit throw handling, the view could stay in loading state forever after upstream failures. The new implementation and tests guarantee deterministic UI behavior for both success and failure states and prevent copy regressions in user-facing messages.
