# CustomMarquee Component

## Overview

CustomMarquee is a lightweight wrapper used for track and metadata text that may overflow its container. It enables horizontal marquee animation only while the component is hovered and only when overflow is detected.

## Features

- Slot-based content rendering
- Overflow-aware animation toggle
- Hover-to-animate interaction model
- Automatic animation reset on mouse leave

## Template Structure

The component renders three nested elements:

- Root container with marquee clipping
- Interactive container that listens for mouse enter and leave
- Text wrapper that conditionally receives the animate class

## Behavior

### Initial State

- Animation is disabled by default.
- The text wrapper is rendered with the marquee-text class only.

### Hover Handling

On mouse enter:

1. The component compares text scroll width and container offset width.
2. Animation is enabled only when text is wider than the container.
3. If text fits, animation remains disabled.

On mouse leave:

- Animation is always disabled.

## Styling Notes

- The animation keyframes are defined as scroll-text.
- The animate modifier applies an 8-second linear infinite animation.
- A gradient mask on the container softens text at the left and right edges.

## Example Usage

```vue
<CustomMarquee>
  {{ track.name }}
</CustomMarquee>
```

## Regression Coverage

The test suite validates:

- Slot rendering
- Animation enablement when overflow exists
- Animation suppression when overflow does not exist
- Animation reset after mouse leave
- Re-evaluation across repeated hover cycles
