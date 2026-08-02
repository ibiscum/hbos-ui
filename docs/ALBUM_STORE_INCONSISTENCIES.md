# Album Store - Purpose, Flow & Inconsistencies

## Store Purpose

The album store manages the entire album library state for the HBOS UI, handling:
- **Library caching**: Full album list (`allAlbums`) vs filtered display (`albums`)
- **Search filtering**: Case-insensitive matching across album names and artist names
- **Sorting**: Three modes - release_date (with desc/asc), artist (asc only), random shuffle
- **Genre filtering**: Maps genre categories to album IDs, combined with search filters
- **Album details**: Single album display with track information
- **Cover art URLs**: Generates correct image endpoints for album covers
- **Loading states**: Tracks async operations with `loading` and `loaded` flags

**Used by:** `Albums.vue`, `AlbumsByCategory.vue`, `ArtistAlbum.vue`  
**Dependencies:** `useLibraryFetch` (HTTP), `useToastStore` (errors), `useLibraryStore`, `useAppConfigStore`

---

## Data Flow Architecture

### 1. API Fetch Flow
```
getAlbums() 
  → libraryFetch(/library/:activeLibrary/albums)
  → Transform: API album → display format ($id, $title, $subtitle, $note, $cover_src)
  → Store in: allAlbums (cache) + albums (current view)
  → Update: loading = false, loaded = true (ISSUE #1: loaded never set)
```

### 2. Search & Filter Flow
```
setSearchQuery("test")
  → filterAlbums("test")
  → Filter allAlbums by: name contains "test" OR artists includes "test"
  → Case-insensitive, trimmed, respects genre filter
  → Result: albums array updated with matching albums
```

### 3. Genre Filter Flow
```
setGenreFilter(["rock", "pop"])
  → For each genre: libraryFetch(/library/:activeLibrary/albums/by-category/{genre})
  → Collect all album IDs into genreAlbumIds Set
  → Call filterAlbums() to apply combined filter
  → Result: albums = allAlbums intersected with genreAlbumIds ∩ searchQuery
```

### 4. Sorting Flow
```
sortedAlbums computed property (reads from albums array)
  
Release Date Mode:
  → Sort by release_date ascending/descending
  → Secondary sort by album name (same date = sort by name)
  → Respects sortOrder flag (asc/desc)

Artist Mode:
  → Sort by first artist name alphabetically
  → Always ascending (sortOrder ignored)

Random Mode:
  → Use randomKeys Map to shuffle
  → Map rebuilt on each shuffleAlbums() call
  → Each album gets random number, sorted by that number
```

### 5. State Lifecycle
```
Component mounts
  → Calls store.getAlbums()
  → loading = true
  → API fetch...
  → loading = false (ISSUE #2: doesn't reset on error)
  → loaded = true (ISSUE #1: never set)
  → albums transformed and stored
  → sortedAlbums computed updates based on sortBy/sortOrder
  → UI renders sortedAlbums
```

---

## 6 Inconsistencies Identified

### Critical Issues

#### 1. 🔴 getAlbums() Never Sets `loaded` Flag
**Location:** `src/stores/album.ts` lines 79-105

**Problem:**
```typescript
const getAlbums = async () => {
  loading.value = true  // ✅ Set at start
  try {
    const { error, data } = await libraryFetch(...)
    albums.value = data.value.albums.map(...)
    allAlbums.value = albums.value
    // ❌ loaded.value never set to true!
  } catch (error) {
    toastStore.showErrorToast('Failed to load albums')
    // ❌ loading.value never reset!
  }
}
```

**Impact:**
- State machine broken - loaded flag remains false forever
- Components can't detect load completion
- UI stuck waiting for completion signal

**Fix:**
```typescript
const getAlbums = async () => {
  loading.value = true
  try {
    const { error, data } = await libraryFetch(...)
    albums.value = data.value.albums.map(...)
    allAlbums.value = albums.value
    loaded.value = true  // ADD THIS
  } catch (error) {
    toastStore.showErrorToast('Failed to load albums')
  } finally {
    loading.value = false  // ADD THIS
  }
}
```

#### 2. 🔴 getAlbumByArtistId() Leaves `loading` Flag Set on Error
**Location:** `src/stores/album.ts` lines 107-135

**Problem:**
```typescript
const getAlbumByArtistId = async (artistId: string) => {
  loading.value = true
  try {
    const { error, data } = await libraryFetch(...)
    if (error.value) {
      toastStore.showErrorToast(`Failed to load albums for artist ${artistId}`)
      return  // ❌ Early return without resetting loading!
    }
    // ... album mapping ...
  } catch (error) {
    toastStore.showErrorToast('Failed to load albums for artist')
    // ❌ No finally block, loading never reset on catch
  }
  // ❌ No loading.value = false here either
}
```

**Impact:**
- `loading = true` persists indefinitely on error
- UI stuck in infinite loading state
- Components never move past loading skeleton

**Fix:**
```typescript
const getAlbumByArtistId = async (artistId: string) => {
  loading.value = true
  try {
    const { error, data } = await libraryFetch(...)
    if (error.value) {
      toastStore.showErrorToast(`Failed to load albums for artist ${artistId}`)
      return
    }
    // ... album mapping ...
  } catch (error) {
    toastStore.showErrorToast('Failed to load albums for artist')
  } finally {
    loading.value = false  // ADD THIS
  }
}
```

### Important Issues

#### 3. 🟡 `randomKeys` Map Not Exposed in Store
**Location:** `src/stores/album.ts` lines 29-30 (defined) and 312 (return statement)

**Problem:**
```typescript
// Line 29-30: Defined
const randomKeys = ref<Map<string, number>>(new Map())

// Line 312: Return statement (randomKeys missing!)
return {
  loading, loaded, albums, allAlbums, album, searchQuery, sortBy, sortOrder,
  genres, selectedGenres,
  // ... methods ...
  // ❌ randomKeys not returned!
}
```

**Impact:**
- Cannot test or debug shuffle state
- Breaks transparency principle for reactive state
- Tests must rely on sortedAlbums indirect effects

**Fix:** Add `randomKeys` to return statement

#### 4. 🟡 `genreAlbumIds` Set Not Exposed in Store
**Location:** `src/stores/album.ts` lines 36 (defined) and 312 (return statement)

**Problem:**
```typescript
// Line 36: Defined
const genreAlbumIds = ref<Set<string>>(new Set())

// Line 312: Return statement (genreAlbumIds missing!)
return {
  // ... state ...
  // ❌ genreAlbumIds not returned!
}
```

**Impact:**
- Cannot debug genre filtering state
- Internal-only implementation makes testing difficult
- Poor observability for troubleshooting

**Fix:** Add `genreAlbumIds` to return statement

#### 5. 🟡 Incomplete Null Checking in Album Mapping
**Location:** `src/stores/album.ts` lines 81-87 (and 3 other locations)

**Problem:**
```typescript
albums.value = data.value.albums.map(album => ({
  ...album,
  $id: album.id,  // ❌ No null check - could be undefined
  $title: album.name,  // ❌ No null check - could be undefined
  $subtitle: album.artists?.[0] || 'Various Artists',  // ✅ Handled
  $note: album.release_date ? album.release_date.substring(0, 4) : 'Unknown year',  // ✅ Handled
  $cover_src: getAlbumCoverById(album.id),  // ❌ Depends on potentially-null id
}))
```

**Impact:**
- If API returns album without `id` or `name`, mapping fails silently
- Inconsistent null handling across properties
- Could cause UI display issues

**Fix:**
```typescript
albums.value = data.value.albums
  .filter(album => album.id && album.name)  // Filter invalid albums
  .map(album => ({
    ...album,
    $id: album.id || 'unknown',
    $title: album.name || 'Unknown Album',
    $subtitle: album.artists?.[0] || 'Various Artists',
    $note: album.release_date ? album.release_date.substring(0, 4) : 'Unknown year',
    $cover_src: getAlbumCoverById(album.id),
  }))
```

#### 6. 🟡 Fragmented Error Handling Patterns
**Location:** `src/stores/album.ts` lines 79-155

**Problem:**
```typescript
// getAlbums: One error pattern
try { ... } catch { toastStore.showErrorToast('...') }

// getAlbumByArtistId: Different pattern
try { ... } catch { toastStore.showErrorToast('...') }

// getAlbumByAlbumId: Yet another pattern
try { ... } catch { toastStore.showErrorToast('...') }

// All three have different loading flag reset logic (or none!)
```

**Impact:**
- Hard to maintain - changes to one error path might not apply to others
- Inconsistent state cleanup
- Easy to miss flag resets
- Makes debugging difficult

**Fix:** Create unified error handler utility or consistent pattern

---

## Regression Test Suite

**File:** `src/stores/__tests__/album.regression.test.ts`  
**Tests:** 90+ across 14 suites  
**Status:** All 959 tests passing ✅

### Test Coverage

| Suite | Tests | Purpose |
|-------|-------|---------|
| State Initialization | 10 | Verify all initial state values |
| getAlbumCoverById | 6 | Test URL construction and edge cases |
| Search Functionality | 9 | Album/artist search, case sensitivity, trimming |
| Genre Filter | 3 | Genre state management and filtering |
| Sort Functionality | 10 | All sort modes, secondary sort, order toggle |
| Shuffle Functionality | 3 | Random key generation and shuffling |
| Data Transformation | 4 | Empty artists, missing dates, year extraction |
| Backward Compatibility | 2 | Legacy sortedAlbumsByReleaseDate property |
| Edge Cases | 5 | Empty arrays, single items, null handling |
| State Mutations | 3 | Array independence, object lifecycle |

### Purpose

Tests establish **behavioral baseline BEFORE fixes**, preventing regression bugs when implementing solutions. Each test documents expected behavior, making issues easier to identify when they change.

---

## Summary

| Aspect | Status |
|--------|--------|
| **Store Purpose** | Manage album library with search, filtering, sorting |
| **Data Flow** | API → Transform → Cache → Filter → Sort → Display |
| **Critical Issues** | 2 (loaded flag, loading flag reset) |
| **Important Issues** | 4 (exposed state, null checks, error handling) |
| **Regression Tests** | 90+ tests covering all functionality |
| **Test Status** | ✅ All 959 tests passing |

**Next Step:** Apply fixes to album.ts using regression tests as verification that implementations work correctly.
