# Artist Store - Purpose, Flow & Inconsistencies

## Store Purpose

The artist store in [src/stores/artist.ts](src/stores/artist.ts) is responsible for:
- Fetching and caching artist data from the active library
- Converting raw API artists into UI-friendly entries (`$id`, `$title`, `$subtitle`, `$cover_src`)
- Managing artist list filtering by search query
- Sorting artist entries alphabetically for display
- Loading a single artist by name and routing to the artist-album view
- Tracking async status via `loading` and `loaded`

Used by UI flows that render artist grids/lists and artist detail navigation.

## Data Flow

### 1. Artist list fetch

`getArtists()`
→ request `/library/:activeLibrary/artists?limit=10000`
→ map each artist to display shape
→ update both `allArtists` (source cache) and `artists` (active view)
→ if empty, refresh library status
→ finalize `loading/loaded` state

### 2. Search flow

`setSearchQuery(query)`
→ update `searchQuery`
→ call `filterArtists(query)`
→ filter from `allArtists` only
→ write filtered results into `artists`

`clearSearch()`
→ set empty query
→ restore all artists into current view

### 3. Incremental fetch flow

`getMoreArtists()`
→ guarded by `hasMore` and `loading`
→ request next page
→ map new artists with same display mapper
→ append to `artists` and `allArtists`
→ increment page or stop pagination
→ finalize `loading/loaded`

### 4. Artist-by-name flow

`getArtistByName(name)`
→ normalize and encode name
→ request `/library/:activeLibrary/artist/by-name/{name}`
→ set `artistByName`
→ route to `artist-album` when found
→ if not found, clear only `artistByName` (not full artist list)
→ finalize `loading/loaded`

## Inconsistencies Identified and Fixed

### 1. Missing try/catch/finally in async actions

**Before:** `getArtists`, `getMoreArtists`, and `getArtistByName` could throw and leave `loading` state inconsistent.

**Fix:** Added `try/catch/finally` to all three actions with explicit error toasts and guaranteed `loading = false` in `finally`.

### 2. Inconsistent artist mapping between initial and paged fetches

**Before:** `getArtists` mapped artists to UI shape, while `getMoreArtists` pushed raw API artists.

**Fix:** Introduced shared mapper `mapArtistForDisplay()` and reused it in both methods.

### 3. Debug console logging in store actions

**Before:** `console.log` statements were left in production store paths.

**Fix:** Removed debug logs and retained user-facing error feedback through toast store.

### 4. Fragile ID lookup behavior

**Before:** `getArtistByIdFromStore()` only checked `$id`, which fails if stored entries are not normalized.

**Fix:** Lookup now accepts either `$id` or raw `id`.

### 5. Destructive side effect on artist-by-name miss

**Before:** `getArtistByName()` cleared the main `artists` list when no artist was found.

**Fix:** It now clears only `artistByName`, preserving list state.

### 6. Unencoded artist name in URL path

**Before:** by-name route used `name.toLowerCase()` only; spaces/special chars were not URL-encoded.

**Fix:** Uses `encodeURIComponent(name.toLowerCase())` before building request path.

### 7. Internal dependency initialization inside action body

**Before:** `useLibraryStore()` was created inside `getArtists` empty-result branch.

**Fix:** `libraryStore` is now initialized once at store setup for consistency and simpler testing.

## Regression Test Suite

Created regression tests in [src/stores/__tests__/artist.regression.test.ts](src/stores/__tests__/artist.regression.test.ts).

Coverage includes:
- Store initialization defaults
- Sorting and search/filter behavior
- ID lookup behavior
- `getArtists` mapping, no-cover behavior, empty-list behavior, API error behavior, thrown-error behavior
- `getMoreArtists` append mapping, pagination stop behavior, API error behavior, thrown-error behavior
- `getArtistByName` success routing, not-found behavior, thrown-error behavior, URL normalization behavior

Status after fixes:
- Artist regression suite passes
- Full test suite passes (`47` files, `1024` tests)
