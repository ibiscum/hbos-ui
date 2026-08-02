# CoverArt Loader Service Documentation

## Overview

`coverartloader.ts` is a service that provides intelligent cover art discovery for songs. It integrates with a backend cover art API to find album artwork, artist images, and song-specific cover art through multiple fallback strategies.

## Purpose

The CoverArtLoader service:
1. **Provides multiple retrieval strategies** - Attempts to find cover art from existing metadata, song-specific sources, album sources, and artist sources
2. **Handles API integration** - Communicates with a backend cover art API using base64-encoded safe URL parameters
3. **Filters and optimizes images** - Ensures returned images meet quality criteria (square aspect ratio, optimal resolution)
4. **Gracefully degrades** - Falls back through multiple sources when primary methods fail
5. **Caches configuration** - Uses the AppConfig store to manage API endpoints

## Core Concepts

### Image Quality Filters

The service applies two key filters to optimize returned images:

**Square Aspect Ratio Filter** (`filterSquareImages`):
- Accepts images with aspect ratio between 0.8:1 and 1.2:1
- Rejects landscape and portrait images (typical album art should be square)
- Preserves images with unknown dimensions (conservative approach)
- Rejects zero-dimension images that would cause calculation errors

**Resolution Filter** (`filterByResolution`):
- Keeps the largest resolution image (by area)
- Keeps all images at ≥80% of the largest image's area
- Prevents keeping very small images while avoiding exclusion of similar-resolution alternatives
- Preserves images without dimension data

### Cover Art Sources (Fallback Order)

The service attempts to find cover art in this order:

1. **Existing URLs** - Uses `artwork_url` or `cover_art_url` from song metadata if available
2. **Song-Specific API** - Queries API for exact song + artist match
3. **Album Cover API** - Queries API for album + artist match
4. **Artist Cover API** - Queries API for artist name only
5. **Metadata Fields** - Checks `coverart_url` or `logo_url` in song's metadata object
6. **Failure** - Returns empty result if all strategies fail

## Architecture

### Singleton vs Factory

The module exports both patterns:

```typescript
// Singleton instance
export const coverArtLoader = new CoverArtLoader()

// Factory for dependency injection/testing
export const createCoverArtLoader = () => new CoverArtLoader()
```

Use the **singleton** for typical application usage. Use the **factory** for:
- Unit testing with isolated instances
- Dependency injection patterns
- Creating independent instances for different use cases

### Configuration Management

The service uses `useAppConfigStore()` to access API endpoints:

```typescript
private configStore = useAppConfigStore()
const apiBaseUrl = this.configStore.getApiBaseUrl()
```

This allows:
- Runtime endpoint configuration changes
- Environment-aware proxy/direct connection switching
- Consistent API URL building across the application

## Public API

### Methods

#### `async findCoverArt(song: Song): Promise<CoverArtResult>`

Main method to find cover art for a song using all available strategies.

**Parameters:**
- `song` - Song object with metadata (title, artist, album, etc.)

**Returns:**
```typescript
{
  success: boolean        // True if any cover art found
  urls: string[]         // Array of cover art URLs
  images: CoverArtImage[] // Detailed image objects with metadata
  source: 'song' | 'album' | 'artist' | 'none'
  providers: CoverArtProvider[] // APIs that returned results
}
```

**Behavior:**
1. Checks for existing `artwork_url` or `cover_art_url`
2. If found, returns immediately with source='song'
3. If not found, calls `findCoverArtFromAPI()`
4. If API fails, checks metadata fields as last resort
5. Returns failure if all strategies exhaust

**Example:**
```typescript
const song: Song = {
  title: 'Bohemian Rhapsody',
  artist: 'Queen',
  album: 'A Night at the Opera'
}

const result = await coverArtLoader.findCoverArt(song)
if (result.success) {
  console.log('Found cover art:', result.urls)
  console.log('From:', result.providers.map(p => p.display_name))
} else {
  console.log('No cover art found')
}
```

#### `async findCoverArtFromAPI(song: Song): Promise<CoverArtResult>`

Searches only API sources, bypassing existing URLs and metadata fallbacks.

**Use Cases:**
- Refreshing cover art when cached images fail to load
- Forcing API search when metadata is unreliable
- Testing API functionality independently

**Parameters:** Song object (same as `findCoverArt`)

**Returns:** CoverArtResult with API sources only

#### `async getBestCoverArt(song: Song): Promise<string | null>`

Convenience method returning single best URL.

**Returns:** First URL from `findCoverArt()` or null

**Example:**
```typescript
const bestUrl = await coverArtLoader.getBestCoverArt(song)
if (bestUrl) {
  image.src = bestUrl
}
```

#### `async getSongCoverArt(title: string, artist: string): Promise<CoverArtApiResponse>`

Query API for song-specific cover art.

**Parameters:**
- `title` - Song title (will be base64 encoded)
- `artist` - Artist name (will be base64 encoded)

**Returns:** Raw API response with filtering applied

**Note:** Returns empty results if title or artist missing

#### `async getArtistCoverArt(artist: string): Promise<CoverArtApiResponse>`

Query API for artist cover art.

**Parameters:** Artist name (will be base64 encoded)

**Returns:** Raw API response with filtering applied

#### `async getAlbumCoverArt(album: string, artist: string, year?: number): Promise<CoverArtApiResponse>`

Query API for album cover art.

**Parameters:**
- `album` - Album title (will be base64 encoded)
- `artist` - Artist name (will be base64 encoded)
- `year` - Optional release year (not encoded, passed as-is)

**Returns:** Raw API response with filtering applied

**Note:** Returns empty results if album or artist missing

#### `async getCoverArtFromUrl(url: string): Promise<CoverArtApiResponse>`

Query API for cover art available at a specific URL.

**Parameters:** URL string (will be base64 encoded)

**Returns:** Raw API response with filtering applied

**Use Cases:**
- Extracting cover art from Spotify, LastFM, or other service URLs
- Processing user-provided image URLs

#### `async isApiAvailable(): Promise<boolean>`

Check if backend cover art API is accessible.

**Returns:** Boolean indicating API availability

**Behavior:**
- Makes HEAD request to `/coverart/methods`
- Returns true if response status is 2xx
- Returns false on error or non-2xx status

**Use Cases:**
- Determining whether to attempt API calls
- Health checks
- Showing/hiding API-dependent features in UI

## Data Structures

### CoverArtImage

```typescript
interface CoverArtImage {
  url: string           // Image URL
  width?: number        // Image width in pixels
  height?: number       // Image height in pixels
  size_bytes?: number   // File size in bytes
  format?: string       // Image format (e.g., 'jpeg', 'png')
  grade?: number        // Quality score from provider
}
```

### CoverArtProvider

```typescript
interface CoverArtProvider {
  name: string          // Internal provider identifier
  display_name: string  // Human-readable provider name
}
```

### CoverArtResult

```typescript
interface CoverArtResult {
  success: boolean
  urls: string[]
  images: CoverArtImage[]
  source: 'song' | 'album' | 'artist' | 'none'
  providers: CoverArtProvider[]
}
```

## Error Handling

### Graceful Degradation

The service handles errors gracefully:

**API Request Failures:**
- Network errors → Returns empty results
- Non-200 status codes → Returns empty results
- Malformed JSON → Returns empty results
- Continues to next fallback strategy

**Input Validation:**
- Missing required fields → Returns empty results
- Invalid URLs → Returns empty results
- Invalid base64 encoding → Logs warning, returns empty string

**Filter Application:**
- Images with zero dimensions → Rejected (prevents calculation errors)
- Images without dimensions → Kept (conservative approach)
- All filters fail → Removes provider from results

### Logging

The service logs information for debugging:

```typescript
console.log('🔍 Looking for cover art for song:...')  // Main search
console.log('✅ Using existing cover art URLs...')     // Found in metadata
console.log('Found song/album/artist cover art...')    // API success
console.log('No cover art found...')                    // Failure
console.warn('Cover art API request failed...')        // HTTP errors
console.warn('Failed to fetch cover art...')           // Network errors
```

Remove or disable these logs in production builds if console output is a concern.

## Implementation Details

### URL Encoding

Images are identified by base64-encoded identifiers to safely pass special characters:

```typescript
// Internally handled - these are automatically encoded:
await loader.getSongCoverArt('Song: "Title"', 'Artist & Co.')
// API receives: song/U29uZzog4oCdVGl0bGXigJ0/QXJ0aXN0ICYgQ28u
```

The encoding:
1. UTF-8 encodes the string
2. Base64 encodes the UTF-8
3. Replaces `+` with `-`, `/` with `_`, removes `=` padding (URL-safe encoding)

### API Response Processing

Raw API responses undergo two-stage filtering:

1. **Per-Provider Filtering:**
   - Apply square aspect ratio filter
   - Apply resolution filter within provider
   - Remove providers with zero images

2. **Result Extraction:**
   - Combine images from all providers
   - Extract URLs for convenience
   - Preserve provider information

## Usage Examples

### Basic Cover Art Retrieval

```typescript
import { coverArtLoader } from '@/services/coverartloader'

export default {
  data() {
    return {
      coverUrl: null
    }
  },
  async mounted() {
    const result = await coverArtLoader.findCoverArt(this.currentSong)
    this.coverUrl = result.urls[0] || '/images/default-cover.png'
  }
}
```

### Component with Fallback

```typescript
async getCoverArt() {
  const bestUrl = await coverArtLoader.getBestCoverArt(this.song)
  
  return bestUrl || this.getDefaultCover()
}

getDefaultCover() {
  if (this.song.artist) {
    return `/images/artist-${this.song.artist.toLowerCase()}.png`
  }
  return '/images/default-cover.png'
}
```

### Checking API Availability

```typescript
async mounted() {
  const available = await coverArtLoader.isApiAvailable()
  
  if (!available) {
    this.showNotification('Cover art service unavailable')
  }
  
  this.loadCoverArt()
}
```

### Refreshing on Failure

```typescript
async handleImageError() {
  // First attempt failed, try API-only sources
  const result = await coverArtLoader.findCoverArtFromAPI(this.song)
  
  if (result.urls.length > 0) {
    this.coverUrl = result.urls[0]
  } else {
    this.showPlaceholder()
  }
}
```

### Testing with Factory

```typescript
import { createCoverArtLoader } from '@/services/coverartloader'

describe('CoverArt integration', () => {
  let loader

  beforeEach(() => {
    loader = createCoverArtLoader()
  })

  it('should find cover art', async () => {
    const result = await loader.findCoverArt(testSong)
    expect(result.success).toBe(true)
  })
})
```

## Performance Considerations

### API Calls

The service makes sequential API calls following the fallback chain:
1. Song-specific → 1 API call
2. Album → 1 API call (if song not found)
3. Artist → 1 API call (if album not found)

Maximum of 3 API calls per `findCoverArtFromAPI()` invocation.

### Caching Recommendations

For production, consider caching results:

```typescript
// Cache implementation example
const coverArtCache = new Map()

async function getCachedCoverArt(song) {
  const cacheKey = `${song.artist}|${song.album}`
  
  if (coverArtCache.has(cacheKey)) {
    return coverArtCache.get(cacheKey)
  }
  
  const result = await coverArtLoader.findCoverArt(song)
  coverArtCache.set(cacheKey, result)
  
  return result
}
```

### Image Loading

Returned URLs point to external resources. Consider:
- Using CDN caching headers if hosting images
- Lazy loading images in lists
- Setting reasonable timeouts for image loads
- Providing fallback placeholders

## Related Files

- [appconfig.ts](appconfig.md) - Configuration store used for API endpoints
- [http.ts](../src/api/http.ts) - HTTP client used for API requests
- [player types](../src/types/player.ts) - Song interface definition
