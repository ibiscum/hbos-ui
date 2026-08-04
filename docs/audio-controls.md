# AudioControls.vue - Comprehensive API Documentation

**Location**: [src/components/AudioControls.vue](src/components/AudioControls.vue)  
**Type**: Vue 3 Composition API Component (`<script setup>`)  
**Language**: TypeScript  
**Statistics**: 426 lines | Template: 89 lines | Script: 47 lines | Styles: 290 lines

---

## Table of Contents

1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Props & Interface](#props--interface)
4. [Template Structure](#template-structure)
5. [Script Functions & Methods](#script-functions--methods)
6. [Store Integration](#store-integration)
7. [Composable Functions](#composable-functions)
8. [CSS Classes & Layout Modes](#css-classes--layout-modes)
9. [Reactive State](#reactive-state)
10. [Error Handling & Edge Cases](#error-handling--edge-cases)
11. [Design Patterns](#design-patterns)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)
14. [Usage Examples](#usage-examples)

---

## Overview

**Purpose**: AudioControls.vue provides a comprehensive playback control interface for HifiBerry audio player, combining:
- Lyrics access toggle with overlay integration
- Favorite/heart button with multi-provider support (Spotify, Apple Music, Local Library)
- Playback controls: shuffle, previous, play/pause, next, loop modes
- Responsive layout with three CSS-based layout modes

**Key Features**:
- Multi-mode responsive design (default grid, flexible separate layout, compact header mode)
- Dynamic button capabilities based on player hardware support
- Lyrics availability detection with disabled state management
- Favorite provider detection with formatted title display
- Loading state feedback via disabled button styling
- Keyboard-accessible button controls

**Dependencies**:
- Vue 3 Composition API with `<script setup>`
- Pinia store (`usePlayerStore`)
- Composable (`useAudioControls`)
- Child components: `IconButton`, `LyricsOverlay`

## Testing Snapshot (2026-08-04)

Validated with [src/components/__tests__/AudioControls.test.ts](../src/components/__tests__/AudioControls.test.ts) using a targeted per-file coverage run.

- Tests passing: 11/11
- Statements: 100%
- Lines: 100%
- Functions: 100%
- Branches: 97.77%

Coverage command:

```bash
pnpm vitest run src/components/__tests__/AudioControls.test.ts --coverage --coverage.include=src/components/AudioControls.vue
```

Consolidated coverage areas:

- unit: class composition and sticky/non-sticky rendering
- unit: play/pause and loop icon/title bindings
- unit: favorite heart title/icon state and provider formatting
- unit: capability, checking-favorite, and sending-command disable gates
- unit: control action dispatch for shuffle/previous/play-next/loop/favorite
- regression: lyrics overlay open/close behavior and null-song guard path

---

## Component Architecture

### Lifecycle Events

**Initialization** (`onMounted` - implicit):
1. Component mounts with default props
2. Store refs are dereferenced via `storeToRefs(playerStore)`
3. `showLyricsOverlay` ref initialized to `false`
4. `audioControls` composable initialized

**Reactivity Chain**:
```
Store Updates
    ↓
storeToRefs Auto-Unwrap
    ↓
Computed Properties Update
    ↓
Template Re-render
    ↓
CSS Class Binding Updates
```

### Component Hierarchy

```
AudioControls (root)
├── Left Section
│   └── lyrics-button (native button)
├── Spacer 1 (grid placeholder)
├── Center Section (main controls)
│   ├── IconButton (shuffle - conditional)
│   ├── IconButton (previous)
│   ├── IconButton (play/pause)
│   ├── IconButton (next)
│   └── IconButton (loop - conditional)
├── Spacer 2 (grid placeholder)
├── Right Section
│   └── heart-button (native button - conditional)
└── LyricsOverlay (sibling in template wrapper)
```

---

## Props & Interface

### Interface Definition

```typescript
interface AudioControlsProps {
  isSeparate?: boolean      // Enable flexible layout mode (gap-based)
  isOnSticky?: boolean      // Hide shuffle/heart buttons (mobile header mode)
  isOnHeader?: boolean      // Enable compact grid layout (fixed spacers, smaller icons)
}
```

### Props Breakdown

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isSeparate` | `boolean` | `false` | Switches to flexbox layout with 48px gaps. Used in separate control panels. Overrides default grid. |
| `isOnSticky` | `boolean` | `false` | Hides shuffle and heart buttons. Used in sticky/floating headers. Only center controls visible. |
| `isOnHeader` | `boolean` | `false` | Activates compact header mode: fixed 40px spacers, smaller icons (70% of normal). Grid-based layout. |

### Prop Priority & Combinations

**Single Props**:
- `isSeparate=true` → Flex layout, 48px gaps, all buttons visible
- `isOnHeader=true` → Grid layout, 40px fixed spacers, smaller icons
- `isOnSticky=true` → Default grid layout, shuffle/heart hidden, center buttons only

**Combined Props**:
- `isSeparate + isOnHeader` → Grid takes precedence (is-on-header overrides)
- `isOnSticky + isSeparate` → Flex layout applies, shuffle/heart hidden regardless
- `isOnSticky + isOnHeader` → Grid layout applies, shuffle/heart hidden

---

## Template Structure

### Outer Wrapper
```html
<div>                           <!-- Vue template wrapper (not rendered in DOM) -->
  <div class="app-audio-controls">  <!-- Root element with class bindings -->
    ...
  </div>
  <LyricsOverlay ... />         <!-- Sibling component at template level -->
</div>
```

### Class Binding Logic

**Root Element Classes**:
```typescript
:class="[
  { 'is-separate': isSeparate, 'is-on-header': isOnHeader },
  $attrs.class  // Pass-through custom classes via inheritAttrs: false
]"
```

**Behavior**:
- `is-separate` class: Applied when `isSeparate` prop is true
- `is-on-header` class: Applied when `isOnHeader` prop is true
- Custom classes from parent pass through via `$attrs.class`
- Multiple classes can coexist; CSS specificity rules apply

### Left Section: Lyrics Button

**Purpose**: Toggle lyrics overlay display  
**Disabled State**: When `song?.metadata?.lyrics_available === false`  
**Active State**: Styled when `song?.metadata?.lyrics_available === true`

```html
<div class="app-audio-controls__left">
  <button
    class="app-audio-controls__secondary lyrics-button"
    :class="{ 'lyrics-button--active': song?.metadata?.lyrics_available }"
    :disabled="!song?.metadata?.lyrics_available"
    @click="openLyrics"
  >
    <img src="/images/svg/tabler/lyrics.svg" alt="Lyrics" />
  </button>
</div>
```

**Rendering Rules**:
- Always rendered in template
- Visibility: Hidden in `@media (max-width: 500px)`
- Display: `flex` with `justify-content: flex-start`
- Disabled state: Cannot click when lyrics not available
- Active class: Toggles opacity and filter styling

### Center Section: Main Controls

**Purpose**: Playback control buttons  
**Conditional Rendering**:
- Shuffle button: Hidden when `isOnSticky === true`
- Loop button: Hidden when `isOnSticky === true`
- Play/Pause: Always visible (core control)

**Button Order**: Shuffle (optional) → Previous → Play/Pause → Next → Loop (optional)

**Capability Gating**:
```typescript
:disabled="isSendingCommand || !caps.canX"  // where X = { Shuffle, Previous, Play, Pause, Next, Loop }
```

**Play/Pause Icon Logic**:
```typescript
:icon="audioControls.isPlaying ? 'lucide/pause' : 'lucide/play'"
```

**Loop Icon Logic**:
```typescript
:icon="audioControls.iscurrentLoopModeTrack ? 'lucide/repeat-1' : 'lucide/repeat'"
```

**Title Formatting**:
- Shuffle: `"Shuffle"`
- Previous: `"Previous"`
- Play/Pause: `"Play/Pause"`
- Next: `"Next"`
- Loop: Dynamic based on mode:
  - Track mode: `"Loop Track"`
  - Playlist mode: `"Loop Playlist"`
  - Off mode: `"Loop"`

### Spacer Elements

**Purpose**: Flexible spacing in grid layout  
**Count**: Two spacers (before and after main controls)  
**Grid Behavior**:
- Default layout: `1fr` unit (takes available space)
- Header layout: Fixed `40px` width
- Separate layout: `flex` gap handles spacing (spacers hidden via CSS)

```html
<div class="app-audio-controls__spacer"></div>
```

### Right Section: Heart Button

**Purpose**: Toggle favorite status with provider info  
**Conditional Rendering**: Hidden when `isOnSticky === true`  
**Disabled States**:
- `isSendingCommand === true` (command in progress)
- `checkingFavourite === true` (checking favorite status)

```html
<div class="app-audio-controls__right">
  <button
    v-if="!isOnSticky"
    class="app-audio-controls__secondary heart-button"
    :class="{ 'heart-button--active': currentSongIsFavourite }"
    :title="heartButtonTitle"
    :disabled="isSendingCommand || checkingFavourite"
    @click="toggleCurrentSongFavourite"
  >
    <img
      :src="currentSongIsFavourite ? '/images/svg/lucide/heart-filled.svg' : '/images/svg/lucide/heart-outline.svg'"
      alt="Favorite"
    />
  </button>
</div>
```

**Icon Selection**:
- `heart-outline.svg`: When `currentSongIsFavourite === false`
- `heart-filled.svg`: When `currentSongIsFavourite === true`

### LyricsOverlay Component

**Purpose**: Full-screen lyrics display with close handler  
**Props Binding**:
```typescript
:is-visible="showLyricsOverlay"  // Boolean ref tracking overlay state
:song="song"                      // Current song from store
@close="closeLyrics"              // Event handler when user closes overlay
```

**Position in Template**: Sibling to root `div` (at wrapper level)  
**z-index**: Managed by LyricsOverlay component (should be above main content)

---

## Script Functions & Methods

### Setup Function Scope

All functions defined in `<script setup>` are implicitly scoped to this component and auto-exposed.

### Lyrics Functions

#### `openLyrics()`

**Purpose**: Open lyrics overlay when availability check passes  
**Signature**: `() => void`  
**Behavior**:
```typescript
const openLyrics = () => {
  if (song.value?.metadata?.lyrics_available) {
    showLyricsOverlay.value = true
  }
}
```

**Conditions**:
- Only opens if `song.value?.metadata?.lyrics_available === true`
- Sets `showLyricsOverlay` ref to `true`
- Called on lyrics button click

**Edge Cases**:
- If song is null: Guard clause prevents error
- If metadata missing: Guard clause prevents error
- If lyrics_available is false: Function silently returns (button disabled anyway)

#### `closeLyrics()`

**Purpose**: Close lyrics overlay  
**Signature**: `() => void`  
**Behavior**:
```typescript
const closeLyrics = () => {
  showLyricsOverlay.value = false
}
```

**Trigger**: Emitted from `LyricsOverlay` component's `@close` event

### Favorite Functions

#### `toggleCurrentSongFavourite()`

**Purpose**: Delegate favorite toggle to store method  
**Signature**: `() => void`  
**Behavior**:
```typescript
const toggleCurrentSongFavourite = () => {
  playerStore.toggleCurrentSongFavourite()
}
```

**Store Method**: Delegates to `usePlayerStore.toggleCurrentSongFavourite()`  
**Async Handling**: Store method is async; component doesn't await (fire-and-forget)  
**Loading State**: `isSendingCommand` ref is set by store during operation

### Computed Properties

#### `heartButtonTitle`

**Purpose**: Generate formatted title for heart button with provider info  
**Signature**: `computed<string>`  
**Return Type**: Tooltip text for heart button  
**Logic**:

```typescript
const heartButtonTitle = computed(() => {
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

**Favorite Case** (Remove):
- Empty providers list: `"Remove from favorites"`
- With providers: `"Remove from favorites (Spotify, Apple, Local)"`

**Non-Favorite Case** (Add):
- Always: `"Add to favorites"`

**Provider Formatting**:
- First letter capitalized: `spotify` → `Spotify`
- Comma-separated list: `['spotify', 'apple', 'local']` → `"Spotify, Apple, Local"`

---

## Store Integration

### Player Store (`usePlayerStore`)

**Imported via**: `storeToRefs(playerStore)`  
**Auto-unwrap**: refs are automatically unwrapped in template (no `.value` needed)

#### State Refs

| State | Type | Usage |
|-------|------|-------|
| `isSendingCommand` | `ref<boolean>` | Disables all buttons during command execution |
| `playerCapabilities` | `ref<Capabilities>` | Gates button availability based on hardware |
| `currentSongIsFavourite` | `ref<boolean>` | Controls heart icon and active state |
| `currentSongFavouriteProviders` | `ref<string[]>` | Lists providers for title formatting |
| `checkingFavourite` | `ref<boolean>` | Disables heart button during check |
| `currentSong` | `computed<Song \| null>` | Current playing song with metadata |

#### Capabilities Object Structure

```typescript
interface Capabilities {
  canShuffle: boolean    // Shuffle supported
  canPrevious: boolean   // Previous track supported
  canPlay: boolean       // Play supported
  canPause: boolean      // Pause supported
  canNext: boolean       // Next track supported
  canLoop: boolean       // Loop mode supported
}
```

#### Methods

| Method | Signature | Purpose |
|--------|-----------|---------|
| `toggleCurrentSongFavourite()` | `() => Promise<void>` | Toggle favorite status (async) |

### Audio Controls Composable (`useAudioControls`)

**Type**: Composable (not a Pinia store)  
**Import Style**: Direct call, not via `storeToRefs`  
**Return Type**: Object with methods and computed properties

**Returned Properties**:

| Property | Type | Purpose |
|----------|------|---------|
| `isShuffle` | `boolean` | Shuffle mode is active |
| `isPlaying` | `boolean` | Playback is active |
| `iscurrentLoopModeNone` | `boolean` | Loop off |
| `iscurrentLoopModeTrack` | `boolean` | Loop single track |
| `iscurrentLoopModePlaylist` | `boolean` | Loop entire playlist |
| `toggleShuffle()` | `() => void` | Toggle shuffle mode |
| `playNextOrPrev(direction)` | `(direction: 'next' \| 'previous') => void` | Skip track |
| `togglePlayPause()` | `() => void` | Toggle playback |
| `cycleLoopMode()` | `() => void` | Cycle: off → track → playlist → off |

**Access Pattern** (No storeToRefs):
```typescript
const audioControls = useAudioControls()
// Direct access: audioControls.isShuffle (not audioControls.isShuffle.value)
// Template: {{ audioControls.isShuffle }} (auto-unwrapped by Vue)
```

---

## Composable Functions

### Component-Level Functions

#### `openLyrics()`
- **Called by**: Lyrics button `@click`
- **Effect**: Sets `showLyricsOverlay.value = true` if lyrics available
- **Guard**: Checks `song?.metadata?.lyrics_available` before opening

#### `closeLyrics()`
- **Called by**: LyricsOverlay component `@close` event
- **Effect**: Sets `showLyricsOverlay.value = false`
- **Idempotent**: Safe to call multiple times

#### `toggleCurrentSongFavourite()`
- **Called by**: Heart button `@click`
- **Effect**: Delegates to `playerStore.toggleCurrentSongFavourite()`
- **Async**: Store method is async; component doesn't block (fire-and-forget)
- **Loading State**: Store sets `isSendingCommand = true` during operation

---

## CSS Classes & Layout Modes

### BEM Naming Structure

```
.app-audio-controls              // Root block
├── __left                        // Left section element
├── __spacer                      // Spacer element
├── --main                        // Center/main section element
├── __right                       // Right section element
├── __secondary                   // Secondary button modifier (left/right buttons)
├── --active                      // Active state modifier
├── .lyrics-button                // Lyrics button (nested BEM)
├── .lyrics-button--active        // Lyrics button active state
├── .heart-button                 // Heart button (nested BEM)
└── .heart-button--active         // Heart button active state
```

### Layout Modes

#### 1. Default Layout (No Props)
**CSS Class**: `.app-audio-controls` (no additional classes)  
**Display**: `display: grid`  
**Grid Template**: `grid-template-columns: auto 1fr auto 1fr auto`  
**Spacing**:
- Left margin: 30px (md: 15px)
- Right margin: 30px (md: 15px)
- Main controls gap: 32px (md: 16px, sm: 21px)

**Responsive**:
- `@media (max-width: 500px)`: Switches to flex, hides left/right sections

#### 2. Separate Layout (`isSeparate = true`)
**CSS Class**: `.app-audio-controls.is-separate`  
**Display**: `display: flex`  
**Spacing**: `gap: 48px` (md: 23px)  
**All buttons visible**: shuffle, previous, play/pause, next, loop, heart

**Icon sizes**: 24x24px (smaller than default 32x32px)

#### 3. Header Layout (`isOnHeader = true`)
**CSS Class**: `.app-audio-controls.is-on-header`  
**Display**: `display: grid`  
**Grid Template**: `grid-template-columns: auto 40px auto 40px auto`  
**Spacer Width**: Fixed 40px (not flexible)

**Icon sizes**:
- Secondary buttons (lyrics/heart): 22x22px (70% of 32px)
- Main buttons: Inherits from parent (default 48x48px, md 32x32px)

**Use case**: Compact header mode, e.g., sticky player bar

#### 4. Combined (`isSeparate + isOnHeader`)
**CSS Class**: `.app-audio-controls.is-separate.is-on-header`  
**Display**: Grid (header layout wins via `!important`)  
**Grid Template**: Overridden to header format

### Icon Sizing

| Context | Size | Responsive (md) |
|---------|------|-----------------|
| Main controls | 48x48px | 32x32px |
| Secondary buttons (default) | 32x32px | 24x24px |
| Secondary buttons (header) | 22x22px | 17x17px |
| Separate layout | 24x24px | 20x20px |

### Color & Styling

#### SVG Color Variables
- `--main-audio-controls`: Primary color for main control buttons
- `--secondary-audio-controls`: Color for left/right secondary buttons
- `--main-audio-controls-separate`: Variant color in separate layout

#### Stroke Width
- Applied via SCSS mixin: `@include audio-control-stroke`
- Ensures consistent stroke width across responsive sizes

#### Button Disabled State
- Cursor: `not-allowed`
- Visual feedback via opacity or filter manipulation (store-managed)

#### Active State Styling
```scss
.heart-button--active {
  img {
    filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) !important;
  }
}

.lyrics-button--active {
  opacity: 1 !important;
  img {
    filter: invert(17%) sepia(89%) saturate(6472%) hue-rotate(342deg) brightness(92%) contrast(89%) !important;
  }
}
```

---

## Reactive State

### Local State

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| `showLyricsOverlay` | `ref<boolean>` | `false` | Tracks lyrics overlay visibility |

### Computed State

| Computed | Type | Dependencies | Purpose |
|----------|------|---------------|---------|
| `heartButtonTitle` | `computed<string>` | `currentSongIsFavourite`, `currentSongFavouriteProviders` | Generates formatted title with provider list |

### Store State (Reactive via storeToRefs)

| State | Type | Provider | Purpose |
|-------|------|----------|---------|
| `isSendingCommand` | `ref<boolean>` | Player Store | Disables buttons during command execution |
| `playerCapabilities` | `ref<Capabilities>` | Player Store | Gates button availability |
| `currentSongIsFavourite` | `ref<boolean>` | Player Store | Controls heart icon state |
| `currentSongFavouriteProviders` | `ref<string[]>` | Player Store | Provider list for title |
| `checkingFavourite` | `ref<boolean>` | Player Store | Disables heart button during check |
| `currentSong` | `computed<Song \| null>` | Player Store | Current playing song |

### Composable State

| Property | Type | Provider | Purpose |
|----------|------|----------|---------|
| `isShuffle` | `boolean` | useAudioControls | Shuffle mode indicator |
| `isPlaying` | `boolean` | useAudioControls | Playback state indicator |
| `iscurrentLoopModeNone` | `boolean` | useAudioControls | Loop off indicator |
| `iscurrentLoopModeTrack` | `boolean` | useAudioControls | Loop track indicator |
| `iscurrentLoopModePlaylist` | `boolean` | useAudioControls | Loop playlist indicator |

---

## Error Handling & Edge Cases

### Null Safety

**Current Song Null**:
```typescript
// Guard clause protects against null song
if (song.value?.metadata?.lyrics_available) { ... }
```
- Safely returns false if song is null
- Template guard prevents rendering errors

**Null Providers**:
```typescript
const providers = currentSongFavouriteProviders.value || []
if (providers.length > 0) { ... }
```
- Handles null or undefined providers array

### Missing Capabilities

**Scenario**: Player doesn't support a capability  
**Handling**: Button is disabled via `:disabled="!caps.canX"`  
**Effect**: Button is rendered but not clickable

```typescript
// Example: No shuffle support
:disabled="isSendingCommand || !caps.canShuffle"
// If canShuffle is undefined/false → button disabled
```

### Lyrics Availability Check

**Not Available**:
- Button is disabled: `:disabled="!song?.metadata?.lyrics_available"`
- Active class not applied: `:class="{ 'lyrics-button--active': song?.metadata?.lyrics_available }"`
- Clicking does nothing (prevented by disabled attribute)

**Available**:
- Button is enabled
- Active class applied (visual feedback)
- Click opens overlay

### Song Changes

**Scenario**: Song changes while lyrics overlay is open  
**Expected**: Overlay shows new song's lyrics or closes  
**Handling**: `LyricsOverlay` component receives new `song` prop  
**Note**: Component doesn't auto-close; user must manually close

### Concurrent Commands

**Scenario**: Multiple button clicks rapidly  
**Protection**: `isSendingCommand` flag disables all buttons  
**Effect**: Prevents double-submission, race conditions  
**Duration**: Maintains disabled state until store finishes command

### Missing SVG Assets

**Scenario**: SVG file not found at path  
**Fallback**: Browser shows broken image icon  
**Recommended**: Use image error handler or fallback icon

**Asset Paths**:
- `/images/svg/tabler/lyrics.svg` - Lyrics button icon
- `/images/svg/lucide/heart-outline.svg` - Heart outline icon
- `/images/svg/lucide/heart-filled.svg` - Heart filled icon
- `/images/svg/lucide/shuffle.svg` - Shuffle icon (via IconButton)
- `/images/svg/lucide/skip-back.svg` - Previous icon (via IconButton)
- `/images/svg/lucide/play.svg` - Play icon (via IconButton)
- `/images/svg/lucide/pause.svg` - Pause icon (via IconButton)
- `/images/svg/lucide/skip-forward.svg` - Next icon (via IconButton)
- `/images/svg/lucide/repeat.svg` - Loop icon (via IconButton)
- `/images/svg/lucide/repeat-1.svg` - Loop track icon (via IconButton)

---

## Design Patterns

### Reactive Props Binding

**Pattern**: Props are destructured in setup, not directly used in template  
**Reason**: Destructured props are more readable in script section

```typescript
const { isSeparate = false, isOnSticky = false, isOnHeader = false } = defineProps<AudioControlsProps>()
```

**Template Usage**: Props are directly accessible via destructured variables  
**Benefit**: IDE autocomplete, type safety

### Store State with storeToRefs

**Pattern**: Using `storeToRefs()` to auto-unwrap reactive refs  
**Reason**: Prevents losing reactivity when destructuring

```typescript
const { isSendingCommand, playerCapabilities: caps, ... } = storeToRefs(playerStore)
```

**Template Access**: No `.value` needed, auto-unwrapped by Vue

```html
<!-- Correct: refs auto-unwrapped in template -->
:disabled="isSendingCommand"

<!-- Not needed: .value is not required in template -->
<!-- :disabled="isSendingCommand.value" -->
```

### Composable without storeToRefs

**Pattern**: Direct composable call without store destructuring  
**Reason**: Composable returns computed properties, not refs

```typescript
const audioControls = useAudioControls()
// Access via: audioControls.isShuffle (not ref)
// In template: {{ audioControls.isShuffle }}
```

### Conditional Rendering via v-if

**Pattern**: Use `v-if` for structural changes (shuffle, heart on sticky)  
**Reason**: Prevents re-renders of hidden components

```html
<IconButton v-if="!isOnSticky" ... />
<button v-if="!isOnSticky" ... />
```

### Class Binding for State

**Pattern**: Use `:class` with computed properties for visual state  
**Advantage**: Reactive class application without manual DOM manipulation

```html
:class="{ 'is-separate': isSeparate, 'is-on-header': isOnHeader }"
:class="{ 'lyrics-button--active': song?.metadata?.lyrics_available }"
```

### inheritAttrs: false

**Pattern**: Manually control attribute inheritance  
**Implementation**:
```typescript
defineOptions({
  inheritAttrs: false
})
```

**Benefit**: Precise control over which attributes propagate  
**Use case**: Accepts custom `class` attr via `$attrs.class`

```html
:class="[{ 'is-separate': isSeparate, 'is-on-header': isOnHeader }, $attrs.class]"
```

### Guard Clauses in Conditionals

**Pattern**: Use optional chaining (`?.`) and nullish coalescing  
**Reason**: Prevent errors with null/undefined values

```typescript
if (song.value?.metadata?.lyrics_available) { ... }
// Safely returns false if any level is null
```

### Computed Properties for Formatting

**Pattern**: Use computed properties for derived state  
**Reason**: Reactive, cached, and declarative

```typescript
const heartButtonTitle = computed(() => {
  // Formatting logic here
  return title
})
```

---

## Best Practices

### DO

✅ **Use storeToRefs for store state**
```typescript
const { isSendingCommand } = storeToRefs(playerStore)
```

✅ **Guard against null/undefined**
```typescript
if (song.value?.metadata?.lyrics_available) { ... }
```

✅ **Use v-if for conditional rendering of buttons**
```html
<IconButton v-if="!isOnSticky" ... />
```

✅ **Apply computed properties for formatting**
```typescript
const heartButtonTitle = computed(() => { ... })
```

✅ **Use consistent button structure**
```html
<button @click="handler" :disabled="condition">
  <img ... />
</button>
```

✅ **Test all layout modes**
- Default grid layout
- Separate layout (isSeparate=true)
- Header layout (isOnHeader=true)
- Combined layouts

✅ **Handle loading states visually**
```html
:disabled="isSendingCommand || checkingFavourite"
```

### DON'T

❌ **Don't use .value in template**
```html
<!-- Wrong -->
:disabled="isSendingCommand.value"

<!-- Correct -->
:disabled="isSendingCommand"
```

❌ **Don't directly mutate store state**
```typescript
// Wrong
playerStore.isSendingCommand = true

// Correct
playerStore.toggleCurrentSongFavourite()  // Store handles state
```

❌ **Don't forget v-if on conditional buttons**
```html
<!-- Wrong: Button is in DOM but hidden -->
<IconButton v-show="!isOnSticky" ... />

<!-- Correct: Button removed from DOM -->
<IconButton v-if="!isOnSticky" ... />
```

❌ **Don't assume song always exists**
```typescript
// Wrong
const lyrics = song.metadata.lyrics_available  // Null error possible

// Correct
const lyrics = song?.metadata?.lyrics_available  // Safe
```

❌ **Don't create redundant computed properties**
```typescript
// Wrong: State already exists
const favorite = computed(() => currentSongIsFavourite.value)

// Correct: Use directly
// currentSongIsFavourite is already reactive
```

❌ **Don't mix opacity and filter for button state**
```scss
// Inconsistent approach
.button {
  opacity: 0.4;  // One opacity rule
  
  &--active {
    filter: brightness(1);  // Different approach for active
  }
}

// Better: Use consistent approach
.button {
  filter: brightness(0.4);
  &--active {
    filter: brightness(1);
  }
}
```

---

## Troubleshooting

### Issue: Buttons Don't Disable During Command

**Symptom**: Buttons remain clickable while command is executing  
**Root Cause**: `isSendingCommand` not being updated by store  
**Solution**: Verify store method sets `isSendingCommand = true` before async operation

**Check**:
```typescript
// In player store
const toggleCurrentSongFavourite = async () => {
  isSendingCommand.value = true  // Must be set before async call
  try {
    await api.toggleFavorite()
  } finally {
    isSendingCommand.value = false
  }
}
```

### Issue: Lyrics Button Always Disabled

**Symptom**: Lyrics button is disabled even when lyrics are available  
**Root Cause**: `song?.metadata?.lyrics_available` is false or undefined  
**Solution**: Verify song object and metadata structure

**Check**:
```typescript
// Debug in browser console
console.log(song)  // Check song structure
console.log(song.metadata)  // Check metadata
console.log(song.metadata.lyrics_available)  // Check field exists
```

### Issue: Heart Icon Doesn't Update

**Symptom**: Heart icon remains outline even when favorited  
**Root Cause**: `currentSongIsFavourite` not updating  
**Solution**: Verify store is updating ref after toggle

**Check**:
```typescript
// In player store after toggle
currentSongIsFavourite.value = newFavoriteStatus  // Must update ref
```

### Issue: Layout Classes Not Applied

**Symptom**: CSS layout doesn't change when props updated  
**Root Cause**: Props reactive reference issue or CSS specificity  
**Solution**: Verify prop binding and class specificity

**Check**:
```html
<!-- Verify prop is bound -->
<AudioControls :is-separate="isSeparateValue" />

<!-- Check class in browser DevTools -->
<!-- Root element should have .is-separate class -->
```

### Issue: Shuffle/Heart Hidden When Not Expected

**Symptom**: Shuffle or heart buttons missing in certain layout modes  
**Root Cause**: `isOnSticky` prop set to true  
**Solution**: Verify prop values before rendering

**Check**:
```typescript
// In parent component
console.log('isOnSticky:', isOnSticky)  // Should be false to show buttons
```

### Issue: CSS Responsive Breakpoints Not Working

**Symptom**: Layout doesn't change on mobile screens  
**Root Cause**: Breakpoint media query not matching  
**Solution**: Verify viewport size and CSS mixin definitions

**Check**:
```scss
// Ensure media queries are in sync with breakpoints
// @media (max-width: 500px)
// @include media-down(md)  // Check mixin value
```

### Issue: Heart Button Title Missing Provider Info

**Symptom**: Title shows "Remove from favorites" without providers  
**Root Cause**: `currentSongFavouriteProviders` is empty array  
**Solution**: Verify providers are being fetched by store

**Check**:
```typescript
// In browser console
console.log(currentSongFavouriteProviders)  // Should be ['spotify', 'apple', ...] if favorite
```

### Issue: Icons Not Displaying

**Symptom**: Buttons appear empty or with broken image icon  
**Root Cause**: SVG files not found or path incorrect  
**Solution**: Verify SVG file paths exist

**Check**:
```bash
# Verify files exist
ls -la public/images/svg/tabler/lyrics.svg
ls -la public/images/svg/lucide/heart-outline.svg
ls -la public/images/svg/lucide/heart-filled.svg
```

---

## Usage Examples

### Example 1: Default Player Bar
```vue
<template>
  <div>
    <AudioControls />
  </div>
</template>

<script setup lang="ts">
import AudioControls from '@/components/AudioControls.vue'
</script>
```

**Result**: Full grid layout with all controls visible

---

### Example 2: Separate Control Panel
```vue
<template>
  <div class="control-panel">
    <AudioControls is-separate />
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
}
</style>
```

**Result**: Flex layout with large gaps, suitable for standalone control panel

---

### Example 3: Sticky Header Mode
```vue
<template>
  <header class="sticky-header">
    <AudioControls is-on-sticky />
  </header>
</template>

<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  background: var(--background);
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
</style>
```

**Result**: Shuffle and heart buttons hidden, center controls only

---

### Example 4: Header Compact Layout
```vue
<template>
  <header class="compact-header">
    <div class="header-content">
      <h1>Now Playing</h1>
      <AudioControls is-on-header />
    </div>
  </header>
</template>

<style scoped>
.compact-header {
  padding: 16px;
  background: var(--header-background);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
```

**Result**: Compact grid layout with smaller icons, suitable for page header

---

### Example 5: Responsive Combined Layout
```vue
<template>
  <div class="player-interface">
    <!-- Full player view (desktop) -->
    <AudioControls v-if="!isCompact" />
    
    <!-- Compact player view (mobile/sticky) -->
    <AudioControls v-else is-on-header is-on-sticky />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isCompact = ref(false)

onMounted(() => {
  const mediaQuery = window.matchMedia('(max-width: 768px)')
  isCompact.value = mediaQuery.matches
  
  mediaQuery.addEventListener('change', (e) => {
    isCompact.value = e.matches
  })
})
</script>
```

**Result**: Responsive layout switching based on viewport size

---

### Example 6: Custom Styling with Attrs
```vue
<template>
  <AudioControls class="dark-theme large-controls" />
</template>

<style scoped>
:global(.dark-theme .app-audio-controls) {
  --main-audio-controls: #ffffff;
  --secondary-audio-controls: #e0e0e0;
}

:global(.large-controls .app-audio-controls--main svg) {
  width: 64px;
  height: 64px;
}
</style>
```

**Result**: Custom theme and sizing via CSS overrides

---

### Example 7: Integrated with Player Store
```vue
<template>
  <div class="now-playing">
    <div v-if="playerStore.currentSong" class="song-info">
      <h2>{{ playerStore.currentSong.name }}</h2>
      <p>{{ playerStore.currentSong.artist }}</p>
    </div>
    
    <AudioControls />
    
    <div v-if="playerStore.isSendingCommand" class="loading-indicator">
      Sending command...
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import AudioControls from '@/components/AudioControls.vue'

const playerStore = usePlayerStore()
</script>
```

**Result**: Integrated player interface with loading feedback

---

### Example 8: Multiple Instances with Different Modes
```vue
<template>
  <div class="app-layout">
    <!-- Header sticky bar -->
    <header>
      <AudioControls is-on-header is-on-sticky />
    </header>
    
    <!-- Main player view -->
    <main>
      <AudioControls />
    </main>
    
    <!-- Floating control panel -->
    <aside class="floating-panel">
      <AudioControls is-separate />
    </aside>
  </div>
</template>
```

**Result**: Multiple AudioControls instances with different layouts

---

## Performance Considerations

### Reactivity Chain
- Store refs are auto-unwrapped via `storeToRefs` (no manual subscription needed)
- Computed property `heartButtonTitle` is cached and only recomputes when dependencies change
- Class bindings are reactive but don't trigger full re-renders

### Event Handlers
- Event handlers are not inline functions (no recreated on each render)
- Store method delegation (`toggleCurrentSongFavourite()`) prevents closure issues

### Memory
- Component doesn't hold large data structures (only local `showLyricsOverlay` ref)
- LyricsOverlay is unmounted when not visible (no memory leak)

### Recommendations
✅ Cache player capabilities check in component if called frequently  
✅ Debounce rapid button clicks at store level  
✅ Memoize heart button title computation if providers list changes frequently  
✅ Consider lazy-loading LyricsOverlay component for initial load optimization

---

## Related Components

- **[IconButton](../IconButton.vue)**: Reusable button component for main controls
- **[LyricsOverlay](../LyricsOverlay.vue)**: Full-screen lyrics display overlay
- **usePlayerStore**: Pinia store for player state management
- **useAudioControls**: Composable for playback control methods

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial release with full feature set |

---

## Contributing

When modifying AudioControls.vue:

1. **Update tests**: Modify [AudioControls.test.ts](../__tests__/AudioControls.test.ts)
2. **Test all layouts**: Default, is-separate, is-on-header, combinations
3. **Test edge cases**: Null song, missing capabilities, rapid clicks
4. **Check responsive**: Test on mobile, tablet, desktop viewports
5. **Verify accessibility**: Button titles, disabled states, alt text for images
6. **Update docs**: Keep this API documentation in sync with implementation

