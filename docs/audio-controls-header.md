# AudioControlsHeader Component

## Overview

`AudioControlsHeader` is a Vue 3 component that provides a compact header-sized audio control interface for the HiFiBerry OS audio player. It displays playback controls in a centered layout with left and right placeholders for visual symmetry.

**Location:** `src/components/AudioControlsHeader.vue`

**Test File:** `src/components/__tests__/AudioControlsHeader.test.ts`

## Features

- **Playback Controls**: Shuffle, Previous, Play/Pause, Next, and Loop buttons
- **Favorite Toggle**: Heart button to add/remove songs from favorites with provider info
- **Responsive Design**: Adjusts sizing and spacing for tablet and mobile screens
- **State Management**: Integrated with Pinia stores for reactive state updates
- **Lyrics Overlay**: Integration with LyricsOverlay component
- **Accessibility**: Proper ARIA attributes and semantic HTML structure
- **Compact Layout**: Optimized for header display with max-width of 500px

## Component Structure

### Template Structure

```
div.app-audio-controls-header
├── div.audio-controls-placeholder (left placeholder for symmetry)
├── div.app-audio-controls-header--main (centered controls)
│   ├── IconButton (Shuffle)
│   ├── IconButton (Previous)
│   ├── IconButton (Play/Pause)
│   ├── IconButton (Next)
│   ├── IconButton (Loop)
│   └── button.heart-button (Favorite toggle)
└── LyricsOverlay (lyrics display component)
```

## API Reference

### Props

This component does not accept any props. All state is managed via Pinia stores.

### Configuration

```typescript
defineOptions({
  inheritAttrs: false  // Attributes are not inherited on root element
})
```

### Emitted Events

This component does not emit any events directly. All user interactions are handled through store methods.

## State Management

### Player Store (usePlayerStore)

```typescript
// Reactive References
isSendingCommand: Ref<boolean>                    // Indicates if a command is being sent
currentSongIsFavourite: Ref<boolean>              // Current song favorite status
currentSongFavouriteProviders: Ref<string[]>      // Providers where song is favorited
checkingFavourite: Ref<boolean>                   // Indicates favorite check in progress
currentSong: Ref<Song>                            // Currently playing song object

// Capabilities
playerCapabilities: Ref<{
  canShuffle: boolean
  canPrevious: boolean
  canPlay: boolean
  canPause: boolean
  canNext: boolean
  canLoop: boolean
}>

// Methods
toggleCurrentSongFavourite(): Promise<void>       // Toggle favorite status
```

### Audio Controls Store (useAudioControls)

```typescript
// State Properties
isShuffle: boolean                                // Shuffle mode on/off
isPlaying: boolean                                // Playback state
iscurrentLoopModeNone: boolean                    // Loop mode: none
iscurrentLoopModeTrack: boolean                   // Loop mode: single track
iscurrentLoopModePlaylist: boolean                // Loop mode: entire playlist

// Methods
toggleShuffle(): Promise<void>                    // Toggle shuffle mode
playNextOrPrev(direction: 'next' | 'previous'): Promise<void>
togglePlayPause(): Promise<void>                  // Toggle play/pause
cycleLoopMode(): Promise<void>                    // Cycle through loop modes
```

## Buttons & Controls

### Shuffle Button
- **Icon**: `lucide/shuffle`
- **Active Class**: `active` (when shuffle enabled)
- **Disabled When**: 
  - `!caps.canShuffle`
  - `isSendingCommand`
- **Handler**: `audioControls.toggleShuffle`

### Previous Button
- **Icon**: `lucide/skip-back`
- **Disabled When**: 
  - `!caps.canPrevious`
  - `isSendingCommand`
- **Handler**: `audioControls.playNextOrPrev('previous')`

### Play/Pause Button
- **Icons**: 
  - `lucide/play` (when not playing)
  - `lucide/pause` (when playing)
- **Disabled When**: 
  - `!(caps.canPlay || caps.canPause)`
  - `isSendingCommand`
- **Handler**: `audioControls.togglePlayPause`

### Next Button
- **Icon**: `lucide/skip-forward`
- **Disabled When**: 
  - `!caps.canNext`
  - `isSendingCommand`
- **Handler**: `audioControls.playNextOrPrev('next')`

### Loop Button
- **Icons**:
  - `lucide/repeat-1` (when single track loop active)
  - `lucide/repeat` (when playlist loop active)
- **Active Class**: `active` (when any loop mode active)
- **Disabled When**: 
  - `!caps.canLoop`
  - `isSendingCommand`
- **Handler**: `audioControls.cycleLoopMode`

### Heart Button (Favorite Toggle)
- **Images**:
  - `heart-outline.svg` (when not favorite)
  - `heart-filled.svg` (when favorite)
- **Active Class**: `heart-button--active` (when favorite)
- **Title Behavior**:
  - Not favorite: "Add to favorites"
  - Favorite without providers: "Remove from favorites"
  - Favorite with providers: "Remove from favorites (Provider1, Provider2, ...)"
- **Disabled When**:
  - `isSendingCommand`
  - `checkingFavourite`
- **Handler**: `playerStore.toggleCurrentSongFavourite`
- **Provider Formatting**: Provider names are capitalized (e.g., 'spotify' → 'Spotify')

## Styling

### CSS Classes

#### Main Container
- `.app-audio-controls-header` - Root container with flex layout
  - `max-width: 500px`
  - `display: flex`
  - `justify-content: center`

#### Controls Section
- `.app-audio-controls-header--main` - Centered controls wrapper
  - `display: flex`
  - `gap: 16px` (desktop), `12px` (tablet), `8px` (mobile)
  - `align-items: center`
  - `justify-content: center`

#### Button Styling
- `.app-audio-controls__secondary` - Secondary controls (shuffle, loop)
  - Icon size: `20px` (desktop), `18px` (tablet)
- `.app-icon` - Main control icons
  - Icon size: `24px` (desktop), `20px` (tablet)

#### Heart Button
- `.heart-button` - Favorite toggle button
  - Base opacity: `0.4`
  - Margins: `15px` left and right
- `.heart-button--active` - Active state
  - Opacity: `1`
  - Applied when `currentSongIsFavourite` is true

#### Placeholder
- `.audio-controls-placeholder` - Left placeholder for symmetry
  - `width: 50px` (desktop), `48px` (tablet)
  - `height: 20px` (desktop), `18px` (tablet)
  - `flex-shrink: 0`

### Responsive Breakpoints

- **Desktop (default)**: No special sizing
- **Tablet (md)**: Reduced gap and icon sizes
- **Mobile (sm)**: Further reduced gap for small screens

Media queries use SCSS `@include media-down(md)` and `@include media-down(sm)` mixins.

## Computed Properties

### `heartButtonTitle`

Computes the title attribute for the heart button based on favorite status and providers.

```typescript
computed(() => {
  if (currentSongIsFavourite.value) {
    const providers = currentSongFavouriteProviders.value
    if (providers.length > 0) {
      const serviceList = providers
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(', ')
      return `Remove from favorites (${serviceList})`
    }
    return 'Remove from favorites'
  } else {
    return 'Add to favorites'
  }
})
```

## Methods

### `toggleCurrentSongFavourite`

Handles the click event on the heart button. Calls `playerStore.toggleCurrentSongFavourite()`.

### `closeLyrics`

Closes the lyrics overlay by setting `showLyricsOverlay` to `false`.

## Usage Examples

### Basic Implementation

```vue
<template>
  <AudioControlsHeader />
</template>

<script setup lang="ts">
import AudioControlsHeader from '@/components/AudioControlsHeader.vue'
</script>
```

### As Part of Layout

```vue
<template>
  <div class="player">
    <div class="now-playing">
      <!-- Now playing information -->
    </div>
    <AudioControlsHeader />
    <div class="volume-slider">
      <!-- Volume control -->
    </div>
  </div>
</template>
```

## Test Coverage

The component has comprehensive test coverage including:

### Unit Tests (60+ tests)

1. **Component Structure** (7 tests)
   - Main container rendering
   - Placeholder and sections
   - DOM hierarchy

2. **Play/Pause Button** (4 tests)
   - Icon switching
   - Click handling
   - Disable state

3. **Shuffle Button** (5 tests)
   - Rendering and active state
   - Capability checks
   - Command sending state

4. **Previous/Next Buttons** (5 tests)
   - Rendering
   - Capability checks
   - Command state

5. **Loop Button** (7 tests)
   - Mode detection (none, track, playlist)
   - Icon switching
   - Active state
   - Disable conditions

6. **Heart Button** (12 tests)
   - Icon changes (outline/filled)
   - Active state class
   - Click handling
   - Title computation with providers
   - Disable states

7. **Lyrics Overlay** (4 tests)
   - Component rendering
   - Initial visibility
   - Props passing
   - Close event handling

8. **Component Configuration** (2 tests)
   - Attribute inheritance disabled
   - All buttons disabled state

9. **Regression Tests** (12+ tests)
   - Rapid user interactions
   - State transitions
   - Provider updates
   - Edge cases (null/undefined values)
   - Special characters handling
   - Memory/lifecycle management

### Running Tests

```bash
# Run all AudioControlsHeader tests
pnpm test src/components/__tests__/AudioControlsHeader.test.ts

# Run with coverage
pnpm run test:coverage

# Watch mode
pnpm test --watch
```

## Known Issues & Limitations

1. **Lyrics Button Styling**: CSS classes for a lyrics button exist but are not currently used in the template. The feature may be implemented in future versions.

2. **Store Integration**: Component depends on player and audio-controls stores. Ensure stores are properly initialized before using the component.

3. **Icon Dependencies**: Requires Lucide icons from `/images/svg/lucide/` directory for all control buttons.

## Performance Considerations

- Component uses Pinia stores for efficient state management
- Reactive references ensure minimal re-renders
- CSS uses SCSS mixins for responsive design
- Heart button image switching is CSS-based for performance

## Accessibility

- Left placeholder has `aria-hidden="true"` to hide it from screen readers
- All buttons have descriptive `title` attributes
- Heart button title includes provider information for context
- Proper semantic HTML structure for keyboard navigation

## Related Components

- **[IconButton](./icon-button.md)** - Used for all playback controls
- **[LyricsOverlay](./lyrics-overlay.md)** - Lyrics display component
- **[PlayerStore](../stores/player.md)** - Audio player state management
- **[AudioControls Store](../stores/audio-controls.md)** - Playback control state

## Implementation Notes

### State Reactivity

The component uses `storeToRefs()` to create reactive references from store properties:

```typescript
const {
  isSendingCommand,
  playerCapabilities: caps,
  currentSongIsFavourite,
  currentSongFavouriteProviders,
  checkingFavourite,
  currentSong: song
} = storeToRefs(playerStore)
```

This ensures Vue tracks changes to store properties and updates the template appropriately.

### Button Disable Logic

All buttons are disabled when:
1. `isSendingCommand` is `true` (command is being processed)
2. The specific capability for that action is `false`

Example for shuffle button:
```vue
:disabled="isSendingCommand || !caps.canShuffle"
```

### Icon Sizing

- **Main controls** (play, previous, next): 24px on desktop, 20px on tablet
- **Secondary controls** (shuffle, loop): 20px on desktop, 18px on tablet
- **Heart button**: 20px on desktop, 18px on tablet

## Future Enhancements

1. Implement the existing lyrics button styling for lyrics display
2. Add keyboard shortcuts for playback controls
3. Add animation transitions for state changes
4. Support for customizable control layouts
5. Touch gesture support for mobile

## Changelog

### Version 1.0
- Initial implementation with shuffle, play/pause, next, previous, loop, and favorite controls
- Responsive design for desktop, tablet, and mobile
- Full Pinia store integration
- Comprehensive test coverage (60+ tests)
- LyricsOverlay integration
