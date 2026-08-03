# BackRouter Component

## Overview

`BackRouter` is a specialized navigation component that provides a stylized back button with a rotated caret icon and an animated underline effect. It's built on top of Vue Router's `<router-link>` and is commonly used for back navigation in detail views (e.g., album details, artist details).

## Features

- **Router Integration**: Leverages Vue Router's `<router-link>` for client-side navigation
- **Animated Hover Effects**: Smooth transitions on text underline and icon movement
- **Responsive Design**: Adjusts minimum height for smaller screens
- **Icon Support**: Displays a rotated caret-down icon that transforms to a caret-right on hover
- **Flexible Routing**: Accepts both string paths and route objects
- **Attribute Pass-through**: Supports custom HTML attributes and data attributes via `v-bind`
- **Slot Support**: Allows flexible content rendering

## Props

### `to`

- **Type**: `string | object`
- **Default**: `''` (empty string)
- **Required**: No

Specifies the target route for navigation. Can be:
- A simple path string: `"/albums"`
- A route object: `{ name: 'AlbumDetail', params: { id: 123 } }`

## Slots

### `default`

The main slot for the back button text/content. This content appears next to the icon and is wrapped in a `<span>` with the class `h1`.

**Example Usage**:
```vue
<BackRouter to="/albums">
  Back to Albums
</BackRouter>
```

## Attributes

All standard HTML attributes can be passed through via `v-bind="$attrs"`, including:
- `data-*` attributes for testing
- `aria-*` attributes for accessibility
- `title`, `class`, etc.

**Example Usage**:
```vue
<BackRouter 
  to="/albums"
  data-testid="album-back-button"
  aria-label="Navigate back to albums"
>
  Back
</BackRouter>
```

## Styling

### CSS Classes

- `.back-router`: Main container with flexbox layout
- `.h1`: Wrapper for the slot content, styled as a heading
- `svg`: The icon element (caret-down, rotated 90deg to appear as caret-right)

### CSS Variables

- `--color-icon-primary`: Color applied to the icon
- `--color-head`: Hover state underline color for the heading text

### Layout

- **Display**: `inline-flex` with center-aligned items
- **Gap**: 10px between icon and text
- **Minimum Height**: 28px (24px on screens smaller than `lg` breakpoint)

### Visual Effects

- **Icon Rotation**: 90-degree rotation (caret-down → caret-right)
- **Hover Icon Movement**: Additional 2px downward translate on hover
- **Underline Animation**: Text underline appears on hover with smooth 0.2s transition
- **Transition Timing**: All effects use `0.2s linear` timing

## Component Structure

```html
<router-link :to="to" v-bind="$attrs" class="back-router">
  <Icon icon="caret-down" />  <!-- Rotated 90deg, acts as caret-right -->
  <span class="h1">
    <slot />                  <!-- User content -->
  </span>
</router-link>
```

## Usage Examples

### Basic Back Navigation

```vue
<template>
  <BackRouter to="/albums">
    Back to Albums
  </BackRouter>
</template>
```

### With Route Object

```vue
<template>
  <BackRouter :to="{ name: 'Albums', params: { view: 'grid' } }">
    Back to Album Grid
  </BackRouter>
</template>
```

### With Attributes

```vue
<template>
  <BackRouter 
    to="/artists"
    data-testid="artist-back"
    title="Return to artists list"
  >
    Back to Artists
  </BackRouter>
</template>
```

### In a Detail View

```vue
<template>
  <div class="album-detail">
    <BackRouter :to="{ name: 'Albums' }">
      Back to All Albums
    </BackRouter>
    <AlbumContent :album="currentAlbum" />
  </div>
</template>
```

## Accessibility

The component inherits accessibility features from Vue Router's `<router-link>`. For better accessibility:

1. Use clear, descriptive text in the slot
2. Add `aria-label` attribute if the text is ambiguous
3. The component is keyboard accessible (focus and Enter key work naturally)

```vue
<BackRouter 
  to="/albums"
  aria-label="Navigate back to the albums list"
>
  Back
</BackRouter>
```

## Performance Considerations

- Lightweight wrapper component with minimal rendering overhead
- Uses CSS transitions for animations (GPU-accelerated)
- No unnecessary watchers or computed properties
- All props are scalar or route objects (no deep reactivity needed)

## Browser Support

Compatible with all modern browsers that support:
- CSS Flexbox
- CSS Transforms and Transitions
- Vue 3.3+

## Related Components

- [Icon Component](icon.md) - The underlying icon component
- Vue Router's `<router-link>` - The underlying navigation component

## Testing

Comprehensive unit and regression tests are available in `BackRouter.test.ts`. Tests cover:

- Component rendering and DOM structure
- Props handling (string paths, route objects, defaults)
- Attribute pass-through
- Slot rendering
- Styling and visual effects
- Integration scenarios
- Regression scenarios (re-renders, rapid prop changes)

## Implementation Notes

### Design Decisions

1. **Inline-Flex Layout**: Chosen over other flexbox variants to allow the component to fit naturally in text flow
2. **Icon Rotation**: The 90-degree rotation of the caret-down icon creates a caret-right pointing backward
3. **Transparent Underline Initially**: The underline text decoration is transparent initially to preserve spacing and avoid layout shifts on hover
4. **Minimal Wrapper**: The component is kept intentionally simple as a thin layer over `<router-link>`

### State Management

- No internal state is maintained
- Component is fully reactive to prop changes
- Animations are purely CSS-based
