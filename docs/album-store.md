# Album Store Documentation

## Overview

The Album Store (`src/stores/album.ts`) is a Pinia state management store that handles album data retrieval, caching, filtering, sorting, and genre management for the HBOS UI application. It provides a centralized interface for managing album collections from the music library backend.

## Purpose

The Album Store serves as the single source of truth for:
- Album collection data from the library API
- Album filtering by search query and genre
- Album sorting (by release date, artist, or random)
- Individual album details lookup
- Album cover image URLs
- Genre/category management and filtering

## Architecture

### State Management

The store maintains the following reactive state:

#### Data State
- **`albums`**: Array of currently displayed albums (filtered results)
- **`allAlbums`**: Array of all albums from the library (unfiltered source)
- **`album`**: Currently selected album's detailed information (null when not loaded)

#### UI State
- **`loading`**: Boolean indicating if an async operation is in progress
- **`loaded`**: Boolean indicating if albums have been successfully loaded

#### Search & Filter State
- **`searchQuery`**: Current search text for filtering albums by name or artist
- **`genres`**: Available genre/category options from the backend
- **`selectedGenres`**: User-selected genres for filtering
- **`genreAlbumIds`**: Set of album IDs matching the selected genres

#### Sorting State
- **`sortBy`**: Sort criteria - 'release_date' | 'artist' | 'random'
- **`sortOrder`**: Sort direction - 'asc' | 'desc'
- **`randomKeys`**: Map of album IDs to random numbers for shuffle sorting

### Computed Properties

#### `sortedAlbums`
Primary computed property that returns filtered albums in sorted order:
- **Random sort**: Albums sorted by random keys (regenerated on shuffle)
- **Release date sort**: 
  - Primary: by release date (ascending or descending per `sortOrder`)
  - Secondary: by album name (alphabetical)
- **Artist sort**:
  - Primary: by first artist name (alphabetical, always ascending)
  - Secondary: by album name (alphabetical)

#### `sortedAlbumsByReleaseDate`
Legacy computed property (kept for backward compatibility) that returns albums sorted by release date in descending order.

## Data Flow

### Album Loading Flow

```
getAlbums()
  ↓
[API] /library/:activeLibrary/albums
  ↓
Validate & map album data:
  - Filter out albums missing id or name
  - Add computed properties ($id, $title, $subtitle, $note, $cover_src)
  ↓
Store in allAlbums + albums
  ↓
Update loaded flag & refresh library status if empty
```

### Album Details Flow

```
getAlbumByAlbumId(id)
  ↓
[API] /library/:activeLibrary/album/by-id/{id}
  ↓
Store detailed album in album ref
```

### Albums by Artist Flow

```
getAlbumByArtistId(id)
  ↓
[API] /library/:activeLibrary/albums/by-artist-id/{id}
  ↓
Map and transform data (same as getAlbums)
  ↓
Replace albums array with artist's albums
```

### Genre Filtering Flow

```
loadGenres()
  ↓
[API] /library/:activeLibrary/categories
  ↓
Store available genres in genres ref

setGenreFilter(newGenres)
  ↓
For each selected genre:
  [API] /library/:activeLibrary/albums/by-category/{genre}
    ↓
    Collect album IDs → genreAlbumIds Set
  ↓
Apply genre filter + search filter via filterAlbums()
```

### Search & Filtering Flow

```
setSearchQuery(query)
  ↓
Store query in searchQuery ref
  ↓
filterAlbums(query):
  1. Start with allAlbums (complete collection)
  2. Filter by genre (if genreAlbumIds is populated)
  3. Filter by search text (album name or artist name)
  4. Update albums array with filtered results

Result: sortedAlbums computed property renders filtered & sorted albums
```

### Sorting Flow

```
setSortBy(criteria)
  ↓
If 'random':
  → Call shuffleAlbums()
     - Generate random keys for each album
     - Set sortBy to 'random'
Else:
  → Update sortBy
  → If artist sort, force sortOrder to 'asc'

toggleSortOrder()
  ↓
Switch sortOrder: asc ↔ desc

Result: sortedAlbums computed property applies new sort order
```

## Key Methods

### Data Loading

| Method | Purpose | API Endpoint | Returns |
|--------|---------|-------------|---------|
| `getAlbums()` | Load all albums from library | `/library/:activeLibrary/albums` | void |
| `getAlbumByAlbumId(id)` | Load specific album details | `/library/:activeLibrary/album/by-id/{id}` | void |
| `getAlbumByArtistId(id)` | Load albums by artist | `/library/:activeLibrary/albums/by-artist-id/{id}` | void |

### Genre Management

| Method | Purpose | Returns |
|--------|---------|---------|
| `loadGenres()` | Fetch available genres/categories | void |
| `setGenreFilter(genres)` | Filter albums by selected genres | void |

### Search & Filtering

| Method | Purpose | Returns |
|--------|---------|---------|
| `setSearchQuery(query)` | Update search and filter albums | void |
| `clearSearch()` | Clear search query and show all albums | void |
| `filterAlbums(query)` | Apply genre + search filters (internal) | void |

### Sorting

| Method | Purpose | Returns |
|--------|---------|---------|
| `setSortBy(criteria)` | Change sort criteria | void |
| `setSortOrder(order)` | Change sort direction | void |
| `toggleSortOrder()` | Switch between asc/desc | void |
| `shuffleAlbums()` | Generate random sort order | void |

### Utilities

| Method | Purpose | Returns |
|--------|---------|---------|
| `getAlbumCoverById(id)` | Generate album cover image URL | string |

## Integration Points

### Dependencies
- **`useLibraryFetch`**: Composable for making library API requests
- **`useToastStore`**: Shows error notifications on API failures
- **`useLibraryStore`**: Accesses active library context and refresh status
- **`useAppConfigStore`**: Gets API base URL for cover image URLs

### Data Types
- **`Album`**: Album object with id, name, artists, release_date, etc.
- **`AlbumDetails`**: Extended album object with track listings
- **`AlbumsResponse`**: API response containing album array
- **`AlbumResponse`**: API response containing single album
- **`AlbumByArtistResponse`**: API response containing albums filtered by artist

## Error Handling

All API calls include error handling that:
1. Catches and logs errors
2. Shows user-friendly error toasts via `toastStore`
3. Returns gracefully without crashing
4. Maintains loading/loaded state flags

Example:
```typescript
if (error.value) {
  const errorMessage = typeof error.value === 'string' ? error.value : 'Unknown error'
  toastStore.showErrorToast(`Failed to load albums: ${errorMessage}`)
  return
}
```

## Performance Notes

- **Data Mapping**: Albums are mapped with computed properties ($id, $title, etc.) for UI consistency
- **Filtering Strategy**: Uses Set for O(1) genre lookups via `genreAlbumIds`
- **Sorting**: Computed property uses spread/sort to avoid mutating original arrays
- **Caching**: `allAlbums` preserves unfiltered data for efficient re-filtering
- **Lazy Loading**: Album details loaded only on demand via `getAlbumByAlbumId()`

## Usage Example

```typescript
import { useAlbumStore } from '@/stores/album'

export default {
  setup() {
    const albumStore = useAlbumStore()

    // Load albums on component mount
    onMounted(async () => {
      await albumStore.getAlbums()
      await albumStore.loadGenres()
    })

    // Search functionality
    const handleSearch = (query: string) => {
      albumStore.setSearchQuery(query)
    }

    // Genre filtering
    const handleGenreFilter = async (genres: string[]) => {
      await albumStore.setGenreFilter(genres)
    }

    // Sorting
    const handleSort = (criteria: 'release_date' | 'artist') => {
      albumStore.setSortBy(criteria)
    }

    return {
      albums: computed(() => albumStore.sortedAlbums),
      loading: computed(() => albumStore.loading),
      handleSearch,
      handleGenreFilter,
      handleSort,
    }
  }
}
```
