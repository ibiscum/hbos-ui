# PosterItem Interface Documentation

## Overview

`PosterItem` is a TypeScript interface that defines the **UI presentation mapping layer** for rendering poster cards in gallery-style views. It provides a standardized structure for display fields used throughout the application in album, artist, and radio station cards.

The interface uses a `$` prefix convention to indicate that all fields are presentation/UI mapping fields, distinguishing them from semantic domain fields defined in derived interfaces.

## Purpose and Design

### Why Separate Presentation from Domain?

The `PosterItem` interface exists because:

1. **Separation of Concerns**: API responses contain semantic data (id, name, artists), while UI needs display-optimized data ($id, $title, $subtitle)
2. **Type Safety**: Derived interfaces (Album, Artist) combine both semantic and presentation fields for type-safe component usage
3. **Reusability**: PosterGrid component works with any type `T extends PosterItem`, enabling generic poster rendering
4. **Consistency**: All poster-based UI follows the same display contract

### Field Naming Convention

The `$` prefix is intentional:

- **`$` prefixed fields** = Presentation/UI mapping fields (this interface)
- **Non-prefixed fields** = Semantic domain fields (Album, Artist, etc.)

This makes it immediately clear whether a field is for rendering (presentation) or for application logic (semantics).

## Interface Definition

```typescript
export interface PosterItem {
  $id?: string
  $title?: string
  $subtitle?: string
  $note?: string
  $cover_src?: string
}
```

### Field Specifications

#### `$id?: string`

**Purpose**: Unique identifier for UI rendering and DOM operations

**Used For**:
- Vue list rendering keys: `v-for="item in items" :key="item.$id"`
- DOM element identification: `:data-id="item.$id"`
- Router parameters: `params: { albumId: item.$id }`
- DOM queries: `document.querySelector('[data-id="album-123"]')`

**Mapping Source**: Typically mapped from semantic `id` field
```typescript
{
  id: 'album-123',      // Semantic field
  $id: 'album-123'      // Presentation field (same value)
}
```

**Constraints**:
- Should be unique within the displayed list
- Must be a valid CSS selector value
- Must be URL-safe (no special characters)

---

#### `$title?: string`

**Purpose**: Primary display text for the poster item

**Used For**:
- Main heading text in poster card
- HTML title attribute for tooltips: `:title="item.$title || ''"`
- Display in list views and grids
- Fallback for alt text in images

**Mapping Source**: Typically mapped from semantic `name` field
```typescript
{
  name: 'Dark Side of the Moon',    // Semantic field
  $title: 'Dark Side of the Moon'   // Presentation field
}
```

**Constraints**:
- Usually short enough to fit single line (but CSS handles overflow)
- May contain special characters requiring HTML escaping
- Cannot be null, use empty string if unavailable

---

#### `$subtitle?: string`

**Purpose**: Secondary display text providing context

**Used For**:
- Secondary information in poster card
- Artist name for albums
- Album count for artists
- Genre or category information
- Displayed below or next to $title with smaller font

**Mapping Examples**:

For Albums:
```typescript
{
  name: 'Album Title',
  artists: ['Artist Name'],        // Semantic field
  $subtitle: 'Artist Name'         // First artist (fallback: "Various Artists")
}
```

For Artists:
```typescript
{
  name: 'Artist Name',
  album_count: 15,                 // Semantic field
  $subtitle: '15 albums'           // Formatted count
}
```

**Constraints**:
- Can be empty string for items without context
- Usually shorter than $title
- May be programmatically formatted (e.g., pluralization)

---

#### `$note?: string`

**Purpose**: Optional additional metadata or label

**Used For**:
- Contextual information on poster card
- Release year or remaster notation
- Curator or playlist info
- Edition information
- Accessibility notes

**Examples**:
- `'2024 Remaster'`
- `'Curated Collection'`
- `'Deluxe Edition'`
- `'Live Recording'`

**Constraints**:
- Completely optional (may be undefined)
- Smallest font size in UI
- Muted color in dark/light themes
- Not all items have note information

---

#### `$cover_src?: string`

**Purpose**: Image source URL or path for the poster thumbnail

**Used For**:
- Image source in poster card: `:src="item.$cover_src"`
- Album artwork display
- Artist thumbnails
- Station logos or images

**URL Types Supported**:

1. **Absolute URLs**:
   ```typescript
   $cover_src: 'https://cdn.example.com/covers/album.jpg'
   $cover_src: 'http://api.local:3000/covers/album.jpg'
   ```

2. **Relative Paths**:
   ```typescript
   $cover_src: '/covers/album.jpg'          // Relative to domain root
   $cover_src: '/api/covers/album.jpg'
   ```

3. **App-Relative Paths**:
   ```typescript
   $cover_src: 'covers/album.jpg'           // Relative to app root
   ```

4. **With CDN Parameters**:
   ```typescript
   $cover_src: 'https://cdn.example.com/covers/album.jpg?size=300&format=webp'
   ```

**Mapping Source**: Typically mapped from cover/thumbnail fields
```typescript
{
  cover_art: '/artwork/album.jpg',           // Semantic field
  $cover_src: '/artwork/album.jpg'           // Presentation field
}
```

**Component Behavior**:
- If undefined: Component renders placeholder/default image
- If invalid URL: Browser's image error handling applies
- Should be CORS-accessible if cross-origin

## Usage Patterns

### 1. Album Store Mapping

```typescript
// src/stores/album.ts - Computed property
const albumDisplayFormat = computed(() => {
  return albums.value.map(album => ({
    ...album,                                    // Semantic fields
    $id: album.id,
    $title: album.name,
    $subtitle: album.artists?.[0] || 'Various Artists',
    $cover_src: getAlbumCoverById(album.id)
  }))
})
```

### 2. Artist Store Mapping

```typescript
// src/stores/artist.ts
const artistDisplayFormat = computed(() => {
  return artists.value.map(artist => ({
    ...artist,                                   // Semantic fields
    $id: artist.id,
    $title: artist.name,
    $subtitle: `${artist.album_count} album${artist.album_count !== 1 ? 's' : ''}`,
    $cover_src: artist.thumb_url?.[0]
  }))
})
```

### 3. Component Usage

```typescript
// src/components/PosterGrid.vue
<script setup lang="ts" generic="T extends PosterItem">
import type { PosterItem } from '@/types/library'

interface PosterGridProps<T> {
  items: T[]
}

const { items } = defineProps<PosterGridProps<T>>()
</script>

<template>
  <div v-for="item in items" :key="item.$id" class="poster-card">
    <img :src="item.$cover_src" :title="item.$title || ''" />
    <h3>{{ item.$title }}</h3>
    <p>{{ item.$subtitle }}</p>
    <small v-if="item.$note">{{ item.$note }}</small>
  </div>
</template>
```

### 4. View Component Usage

```typescript
// src/views/library/albums-by-genre.vue
<PosterGrid
  :items="albumItems"
  @click="(album) => router.push({
    name: 'album',
    params: { albumId: album.$id }  // Uses $id for routing
  })"
/>

<script setup>
const albumItems = computed<Album[]>(() =>
  albums.value.map(album => ({
    ...album,
    $id: album.id,
    $title: album.name,
    $subtitle: album.artists?.[0] || '',
    $cover_src: getAlbumCoverById(album.id)
  }))
)
</script>
```

## Inheritance Hierarchy

### Album Interface

```typescript
export interface Album extends PosterItem {
  id: string
  name: string
  release_date?: string
  tracks_count: number
  cover_art: string
  artists: string[]
}
```

Album extends PosterItem, providing:
- **Semantic fields**: id, name, artists, tracks_count
- **Inherited presentation fields**: $id, $title, $subtitle, $cover_src

### Artist Interface

```typescript
export interface Artist extends ArtistBase, PosterItem {
  album_count: number
  thumb_url: string[]
}
```

Artist extends PosterItem, providing:
- **Semantic fields**: id, name, album_count, thumb_url
- **Inherited presentation fields**: $id, $title, $subtitle, $cover_src

## Best Practices

### ✅ Do

1. **Map from semantic fields**
   ```typescript
   // Good: Explicit mapping
   $id: album.id,
   $title: album.name
   ```

2. **Handle missing data with fallbacks**
   ```typescript
   $subtitle: album.artists?.[0] || 'Various Artists'
   ```

3. **Use consistent formatting**
   ```typescript
   // Format consistently
   $subtitle: `${artist.album_count} album${artist.album_count !== 1 ? 's' : ''}`
   ```

4. **Ensure $id uniqueness**
   ```typescript
   // Guarantee uniqueness in list
   $id: `${type}-${semantic.id}`  // If needed for disambiguation
   ```

### ❌ Don't

1. **Don't use unsanitized user input**
   ```typescript
   // Bad: No escaping
   $title: userInputTitle
   // Good: Let Vue handle escaping in template
   $title: userInputTitle  // Vue escapes in {{ }} context
   ```

2. **Don't set $id to duplicate values**
   ```typescript
   // Bad: Duplicates within list
   items.map(i => ({ ...i, $id: 'fixed-id' }))
   ```

3. **Don't omit $id if component needs it**
   ```typescript
   // Bad: Missing $id for keyed v-for
   { $title: 'Album', $subtitle: 'Artist' }
   // Good: Always include $id
   { $id: 'album-123', $title: 'Album', ... }
   ```

4. **Don't use $cover_src for non-image data**
   ```typescript
   // Bad: Using for non-image
   $cover_src: 'some-text'
   // Good: Image URLs only
   $cover_src: 'https://example.com/image.jpg'
   ```

## Type Safety with Generics

PosterGrid uses generic type constraints for type safety:

```typescript
<script setup lang="ts" generic="T extends PosterItem">
  // T is constrained to types extending PosterItem
  // This ensures T has all required presentation fields
  // Template can safely use: item.$id, item.$title, etc.
</script>
```

This pattern ensures:
- Compile-time type checking
- IDE autocomplete support
- Prevention of missing field errors at runtime

## Testing

See [library.poster.test.ts](../src/types/__tests__/library.poster.test.ts) for comprehensive test coverage:

- Field optionality validation
- UI mapping semantics testing
- Inheritance pattern verification
- Real-world usage pattern testing
- DOM integration testing
- Edge case handling

Test categories covered:
- ✅ Field definitions and types
- ✅ UI mapping semantics
- ✅ Composition with extending interfaces
- ✅ Real-world usage patterns
- ✅ DOM integration (Vue bindings)
- ✅ Backward compatibility
- ✅ Edge cases (empty strings, special chars, long values)

Run tests:
```bash
pnpm run test -- src/types/__tests__/library.poster.test.ts
```

## Migration Guide

### Updating Components to Use PosterItem

**Before**: Direct interface usage without presentation fields
```typescript
interface OldItem {
  id: string
  name: string
  artist: string
}
```

**After**: Extending PosterItem
```typescript
interface NewItem extends PosterItem {
  id: string
  name: string
  artist: string
}

// Mapping in store:
$id: item.id,
$title: item.name,
$subtitle: item.artist,
$cover_src: getCover(item.id)
```

### Updating Templates

**Before**: Using semantic fields
```vue
<h3>{{ album.name }}</h3>
<p>{{ album.artists?.[0] }}</p>
```

**After**: Using presentation fields
```vue
<h3>{{ album.$title }}</h3>
<p>{{ album.$subtitle }}</p>
```

**Benefits**:
- Consistent rendering layer
- Type-safe with generic components
- Easier to refactor display logic
- Better separation of concerns

## Common Issues and Solutions

### Issue: $id undefined in v-for key

**Symptom**: Console warning about v-for keys

**Solution**:
```typescript
// Ensure all items have $id
items.forEach(item => {
  if (!item.$id) {
    item.$id = generateUniqueId()  // Generate if missing
  }
})
```

### Issue: Missing $cover_src shows broken image

**Symptom**: Image placeholders don't render

**Solution**:
```vue
<img
  :src="item.$cover_src || '/images/default-cover.jpg'"
  :alt="item.$title || 'Cover'"
/>
```

### Issue: $subtitle not displaying for some items

**Symptom**: Inconsistent secondary text

**Solution**:
```typescript
// Ensure fallback
$subtitle: item.artists?.[0] || 'Unknown Artist'
```

## Related Files

- **Interface Definition**: [src/types/library/poster.interface.ts](../src/types/library/poster.interface.ts)
- **Test Suite**: [src/types/__tests__/library.poster.test.ts](../src/types/__tests__/library.poster.test.ts)
- **Component Usage**: [src/components/PosterGrid.vue](../src/components/PosterGrid.vue)
- **Album Usage**: [src/stores/album.ts](../src/stores/album.ts)
- **Artist Usage**: [src/stores/artist.ts](../src/stores/artist.ts)
- **Related Docs**: [album-store.md](./album-store.md), [albums-interface.md](./albums-interface.md)

## Summary

`PosterItem` is a lightweight but essential interface that:

1. ✅ Provides **UI presentation mapping** separate from domain logic
2. ✅ Enables **generic component design** via type constraints
3. ✅ Ensures **type-safe rendering** across all poster-based views
4. ✅ Follows a **clear naming convention** ($-prefix for presentation)
5. ✅ Supports **flexible inheritance** for domain-specific types
6. ✅ Makes **display logic refactoring** easier and safer

All poster-based components in the application should extend or use PosterItem for consistent, maintainable UI rendering.
