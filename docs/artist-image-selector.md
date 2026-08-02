# ArtistImageSelector Component

## Overview

The `ArtistImageSelector` component is a Vue 3 modal dialog that allows users to browse and select cover art images for artists. It fetches images from multiple sources via the backend cover art API and displays them in an interactive grid.

## Features

- **Multi-provider Support**: Aggregates images from multiple cover art providers
- **Smart Image Sorting**: Ranks images by quality grade and provider
- **Image Filtering**: Automatically filters out low-quality images (grade < -10)
- **Responsive Grid**: Adapts to different screen sizes
- **Error Handling**: Graceful error states with retry functionality
- **Loading States**: Visual feedback during data fetching
- **Keyboard Navigation**: Close modal with Escape key
- **Image Metadata Display**: Shows provider name, resolution, and file size
- **Image Error Handling**: Gracefully hides broken images

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isVisible` | `boolean` | Yes | Controls whether the modal is displayed |
| `artistName` | `string` | Yes | The name of the artist to fetch cover art for |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | None | Emitted when the user closes the modal (close button, overlay click, or Escape key) |
| `select` | `imageUrl: string` | Emitted when the user selects an image; includes the URL of the selected image |

## Component States

### 1. **Loading State**
- Displays when fetching images from the API
- Shows a loading spinner and "Loading artist images..." message
- Occupies 400px minimum height for consistent layout

### 2. **Error State**
- Displays when the API call fails
- Shows error message: "Failed to load artist images. Please try again."
- Includes a "Retry" button to re-attempt the fetch

### 3. **No Images State**
- Displays when no images are found for the artist
- Shows an icon, heading, and message with the artist name
- Occurs when the API returns empty results or no providers have images

### 4. **Images Grid State**
- Displays images in a responsive grid layout
- Shows image metadata (provider, resolution, file size) in overlay badges
- Responds to hover with scale animation and shadow effect

## Styling & Layout

- **Modal Dimensions**: 800px max width on desktop, responsive on mobile
- **Grid Layout**: Auto-fill with 150px minimum cells (desktop), 120px (mobile)
- **Image Aspect Ratio**: 1:1 (square)
- **Colors**: Uses CSS variables for theming (`--color-primary`, `--color-body-secondary`, etc.)
- **Animations**: Smooth transitions (0.2s ease) and spin animation for loading

## Image Sorting Algorithm

Images are sorted by the following criteria (in order):

1. **Quality Grade (Primary)**: Descending order (highest grade first)
   - Images with a grade are prioritized over those without
   - Images with grade < -10 are filtered out completely

2. **Provider Name (Secondary)**: Alphabetical ascending order
   - Used when grades are equal or both images lack grades
   - Ensures consistent, predictable ordering

## API Integration

The component uses the `coverArtLoader` service to fetch images:

```typescript
const response = await coverArtLoader.getArtistCoverArt(artistName)
```

### Response Structure

```typescript
interface CoverArtApiResponse {
  results: CoverArtProviderResult[]
}

interface CoverArtProviderResult {
  provider: {
    name: string
    display_name: string
  }
  images: CoverArtImage[]
}

interface CoverArtImage {
  url: string
  width?: number
  height?: number
  size_bytes?: number
  format?: string
  grade?: number
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close modal (only when modal is visible) |

## Usage Example

```vue
<template>
  <div>
    <ArtistImageSelector 
      :is-visible="showImageSelector"
      :artist-name="currentArtist"
      @close="showImageSelector = false"
      @select="onImageSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ArtistImageSelector from '@/components/ArtistImageSelector.vue'

const showImageSelector = ref(false)
const currentArtist = ref('The Beatles')

const onImageSelected = (imageUrl: string) => {
  console.log('Selected image:', imageUrl)
  // Update your component state with the selected image
}
</script>
```

## Error Handling

### API Errors
- When the cover art API fails, the component displays an error message
- A "Retry" button allows users to attempt the fetch again
- The error is logged to the console for debugging

### Image Load Errors
- When an individual image fails to load (network error, invalid URL, etc.)
- The image is automatically hidden
- Other images in the grid remain visible
- No visual error indicator is shown to the user

### Edge Cases
- **Empty Artist Name**: Fetch is skipped; component shows nothing
- **No Results**: Displays "No images found" message
- **Missing Metadata**: Component handles missing dimensions, resolution, or file size gracefully

## Performance Considerations

1. **Lazy Loading**: Images use `loading="lazy"` attribute for performance
2. **Visible Trigger**: Images are only fetched when the modal becomes visible
3. **Grid Rendering**: Uses Vue's `v-for` with unique keys for optimal rendering
4. **CSS Optimizations**: Uses SCSS mixins and CSS variables for efficient styling

## Testing

The component includes comprehensive test coverage:

- **Component Rendering**: Visibility states, header rendering, close button
- **Loading States**: Loading spinner display and clearing
- **Error Handling**: Error display, retry functionality, error clearing
- **Image Grid**: Grid rendering, image count, metadata display
- **Image Sorting**: Grade-based sorting, provider sorting, filtering
- **Emissions**: close and select events with correct payloads
- **Keyboard Interaction**: Escape key handling, conditional closing
- **Image Error Handling**: Broken image handling
- **File Size Formatting**: Byte/KB/MB conversion
- **Props Changes**: Reactive updates to visibility and artist name
- **Edge Cases**: Empty artist names, missing metadata, special characters

Run tests with:
```bash
pnpm test src/__tests__/components/ArtistImageSelector.test.ts
```

## Browser Compatibility

- Requires modern browser support for:
  - CSS Grid
  - CSS Variables
  - KeyboardEvent API
  - Fetch API / Promise support
  - ES2015+ JavaScript features

## Dependencies

- **Vue 3.x**: Core framework
- **Icon Component**: Custom icon display component
- **coverartloader Service**: Backend API integration
- **SCSS Mixins**: Popup styling utilities

## Future Enhancements

1. **Image Caching**: Cache fetched images to reduce API calls
2. **Pagination**: Handle large result sets with pagination
3. **Search/Filter**: Filter images by provider, resolution, or quality
4. **Image Preview**: Full-screen preview before selection
5. **Favorites**: Mark and reuse previously selected images
6. **Drag & Drop**: Drag image URLs directly into the selector
7. **Batch Operations**: Select multiple images at once
