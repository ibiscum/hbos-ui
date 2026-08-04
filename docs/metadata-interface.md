# Metadata Interface Documentation

## Overview

The `Metadata` interface provides enriched metadata about artists, including identifiers, visual assets, biographical information, and genre categorization. It's primarily used when displaying detailed artist information and is typically populated from external metadata services.

## Location

```
src/types/library/metadata.interface.ts
```

## Interface Definition

```typescript
export interface Metadata {
  mbid: string[]
  thumb_url: string[]
  banner_url: string[]
  biography: string
  genres: string[]
}
```

## Field Reference

### `mbid: string[]`

**Purpose**: MusicBrainz identifiers for the artist.

**Type**: Array of strings

**Characteristics**:
- Usually contains 0-1 primary ID
- May contain multiple entries for linked identities
- Empty array if no MusicBrainz data is available
- Each ID is typically a UUID format (e.g., `12345678-1234-1234-1234-123456789012`)

**Usage Example**:
```typescript
// Single MusicBrainz ID
metadata.mbid = ['12345678-1234-1234-1234-123456789012']

// No MusicBrainz data
metadata.mbid = []
```

**Related Components**:
- Used in [artist-album.vue](../src/views/library/albums/artist-album.vue) to fetch extended MusicBrainz data
- Checked before displaying MusicBrainz information panel

---

### `thumb_url: string[]`

**Purpose**: Thumbnail image URLs for the artist.

**Type**: Array of strings

**Characteristics**:
- Contains relative or absolute image URLs
- Thumbnail-sized artwork suitable for list/grid displays
- Empty array if no thumbnails available
- May be sourced from multiple providers

**URL Formats**:
```typescript
// Absolute HTTP/HTTPS URLs
metadata.thumb_url = ['https://cdn.example.com/artist-thumb-123.jpg']

// Relative paths
metadata.thumb_url = ['/images/artists/thumb-123.jpg']

// Data URIs
metadata.thumb_url = ['data:image/jpeg;base64,...']
```

**Usage Example**:
```typescript
// Select first available thumbnail
const thumbnailUrl = metadata.thumb_url[0] || '/images/fallback-thumb.png'
```

---

### `banner_url: string[]`

**Purpose**: Banner image URLs for the artist.

**Type**: Array of strings

**Characteristics**:
- Contains relative or absolute image URLs
- Banner-sized artwork suitable for hero/header displays
- Empty array if no banners available
- Typically higher resolution than thumbnails
- Independent from `thumb_url` array

**URL Formats**:
```typescript
// Similar formats as thumb_url
metadata.banner_url = [
  'https://cdn.example.com/artist-banner-123.jpg',
  'https://cdn.example.com/artist-banner-alt.jpg'
]
```

**Usage Example**:
```typescript
// Use first banner if available, fall back to thumbnail
const headerImage = metadata.banner_url[0] || metadata.thumb_url[0]
```

---

### `biography: string`

**Purpose**: Artist biography or description text.

**Type**: String

**Characteristics**:
- May be empty string if unavailable
- Plain text or formatted text content
- May contain multiple paragraphs
- Typically 100-5000+ characters
- May include special characters and unicode
- Sourced from AudioControl REST API or MusicBrainz

**Content Examples**:
```typescript
// Full biography
metadata.biography = 
  'David Bowie was an English singer-songwriter. ' +
  'He was a leading figure in the music industry for over three decades...'

// Empty biography (no data available)
metadata.biography = ''

// With special characters
metadata.biography = 'The Beatles (often stylized as "The Beatles")\n...'
```

**Usage Example**:
```typescript
// Check if biography exists before displaying
if (metadata.biography) {
  // Truncate if too long
  const displayBio = metadata.biography.length > 300
    ? metadata.biography.substring(0, 300) + '...'
    : metadata.biography
}
```

---

### `genres: string[]`

**Purpose**: Music genres associated with the artist.

**Type**: Array of strings

**Characteristics**:
- Contains genre tags or categories
- May contain duplicates if multiple sources report same genre
- Empty array if no genre information available
- Sourced from metadata providers (MusicBrainz, AudioControl, user input)
- Case-sensitive (capitalization varies by source)

**Genre Examples**:
```typescript
metadata.genres = [
  'Rock',
  'Alternative',
  'Indie',
  'Post-rock'
]

// May contain duplicates from multiple sources
metadata.genres = ['Rock', 'Rock', 'Alternative']

// Empty if no genre data
metadata.genres = []
```

**Usage Example**:
```typescript
// Display unique genres
const uniqueGenres = [...new Set(metadata.genres)]
  .sort()
  .join(', ')

// Filter genres by type
const rockGenres = metadata.genres.filter(g => 
  g.toLowerCase().includes('rock')
)
```

---

## Data Constraints

### Array Fields

All array fields (`mbid`, `thumb_url`, `banner_url`, `genres`) follow these constraints:

- **Minimum length**: 0 (empty arrays are valid)
- **Maximum length**: Not enforced at type level (but typically < 10 items)
- **Element type**: Non-null strings
- **Duplicates**: Allowed (particularly in genres and URLs)

### Biography Field

- **Minimum length**: 0 (empty string is valid)
- **Maximum length**: Not enforced at type level (but typically < 10,000 characters)
- **Allowed characters**: Unicode, special characters, newlines
- **Encoding**: UTF-8

---

## Common Usage Patterns

### Pattern 1: Safe Field Access

```typescript
// Check for field existence before use
if (metadata.mbid?.[0]) {
  // Use primary MusicBrainz ID
  fetchMusicBrainzData(metadata.mbid[0])
}
```

### Pattern 2: Fallback Chains

```typescript
// Try multiple image sources
const imageUrl = 
  metadata.banner_url[0] || 
  metadata.thumb_url[0] || 
  '/images/fallback-artist.jpg'
```

### Pattern 3: Deduplication

```typescript
// Remove duplicate genres
const uniqueGenres = [...new Set(metadata.genres)]
```

### Pattern 4: Conditional Display

```typescript
// Only show section if data exists
if (metadata.biography || metadata.genres.length > 0) {
  displayArtistInfoSection()
}
```

### Pattern 5: Validation

```typescript
function isMetadataComplete(metadata: Metadata): boolean {
  return (
    metadata.mbid.length > 0 &&
    metadata.thumb_url.length > 0 &&
    metadata.biography.length > 0 &&
    metadata.genres.length > 0
  )
}
```

---

## API Sources

### MusicBrainz

- **Fields populated**: `mbid`, `biography`, `genres`
- **Service**: [MusicBrainz Service](./musicbrainz-service.md)
- **Notes**: External API calls may be required

### AudioControl REST API

- **Fields populated**: `thumb_url`, `banner_url`, `biography`, `genres`, `mbid`
- **Notes**: Integrated metadata service
- **Fallback**: Used when MusicBrainz data unavailable

### Local/User Data

- **Fields populated**: `genres`, `biography` (custom entries)
- **Notes**: May merge with external data

---

## Related Components

### Components Using Metadata

- **[artist-album.vue](../src/views/library/albums/artist-album.vue)**
  - Primary consumer of Metadata interface
  - Displays biography, genres, and MusicBrainz info
  - Handles image selection and biography truncation

- **[Artist Store](../src/stores/artist.ts)**
  - Manages artist data including metadata
  - Handles API calls and data caching

### Related Types

- **[Artist Interface](./artist-interface.md)**
  - Extends `ArtistBase` and includes Metadata
  - Used throughout artist-related features

- **[ArtistBase](../src/types/library/artist.interface.ts)**
  - Basic artist identification (id, name, is_multi)

---

## Type Definitions

### Artist Type Hierarchy

```typescript
// Basic artist identification
interface ArtistBase {
  id: string
  name: string
  is_multi: boolean
}

// Main artist type with poster mapping
interface Artist extends ArtistBase, PosterItem {
  album_count: number
  thumb_url: string[]
}

// Artist with detailed metadata
interface ArtistMetadata extends ArtistBase {
  metadata: Metadata
}

// Metadata structure
interface Metadata {
  mbid: string[]
  thumb_url: string[]
  banner_url: string[]
  biography: string
  genres: string[]
}
```

---

## Testing

Comprehensive test coverage is provided:

### Unit Tests
- **File**: [metadata.test.ts](../src/types/__tests__/metadata.test.ts)
- **Coverage**: Field types, empty arrays, edge cases, data integrity

### Regression Tests
- **File**: [metadata.regression.test.ts](../src/types/__tests__/metadata.regression.test.ts)
- **Coverage**: Structure stability, array independence, serialization

### Artist Integration Tests
- **File**: [library.artist.test.ts](../src/types/__tests__/library.artist.test.ts)
- **Coverage**: Artist types including Metadata integration

---

## Best Practices

### ✅ Do

- Check array lengths before accessing indices: `metadata.mbid?.[0]`
- Use optional chaining for safe navigation: `metadata.biography?.length`
- Deduplicate genres if combining from multiple sources
- Provide fallback images when URL arrays are empty
- Preserve original biography text formatting

### ❌ Don't

- Assume array fields are non-empty
- Assume biography is always populated
- Modify shared metadata objects without understanding implications
- Treat biography as structured data (it's plain text)
- Assume URL format or validity

---

## Edge Cases

### Empty Metadata
```typescript
const emptyMetadata: Metadata = {
  mbid: [],
  thumb_url: [],
  banner_url: [],
  biography: '',
  genres: []
}
```

### Partial Metadata (Common from APIs)
```typescript
const partialMetadata: Metadata = {
  mbid: [],
  thumb_url: ['url1'],
  banner_url: [],
  biography: 'Some text',
  genres: ['Rock']
}
```

### Multi-value Arrays
```typescript
const richMetadata: Metadata = {
  mbid: ['id1', 'id2'],  // Multiple MusicBrainz IDs
  thumb_url: ['url1', 'url2', 'url3'],  // Multiple thumbnails
  banner_url: ['url1'],
  biography: 'Biography',
  genres: ['Rock', 'Alternative', 'Indie']  // Multiple genres
}
```

---

## Changelog

### Version 1.0 (Current)
- Initial interface definition with 5 fields
- Full JSDoc documentation added
- Support for empty array fields
- Support for empty biography string
- URL field flexibility (relative/absolute paths)

---

## Related Documentation

- [Artist Interface Documentation](./artist-interface.md)
- [MusicBrainz Service](./musicbrainz-service.md)
- [Cover Art Loader](./coverartloader.md)
- [Comprehensive Artist Implementation Notes](./ARTIST-IMAGE-SELECTOR-IMPLEMENTATION.md)

---

## Questions & Support

For questions about the Metadata interface:

1. Check the [usage examples](#common-usage-patterns) above
2. Review [test files](../src/types/__tests__/) for real-world patterns
3. See [artist-album.vue](../src/views/library/albums/artist-album.vue) for production usage
4. Consult the [type definition source](../src/types/library/metadata.interface.ts)
