# ContentBoxLink

## Overview

`ContentBoxLink` composes `ContentBox` with Vue Router's `<router-link>` so settings cards can be both visually consistent and navigable.

Component file: `src/components/ContentBoxLink.vue`
Tests file: `src/components/__tests__/ContentBoxLink.test.ts`

## Props

### `to`

- **Type**: `RouteLocationRaw`
- **Required**: Yes

Target route for `<router-link>`. Supports path strings and route objects.

### `height`

- **Type**: `number`
- **Required**: No

Optional fixed card height in pixels. When provided, the component applies inline style `height: <value>px` to `ContentBox`.

## Slots

### `default`

Card content rendered inside `ContentBox`.

## Behavior

- Renders as a router link wrapper around `ContentBox`.
- Forwards `to` directly to `<router-link>`.
- Applies both classes below to preserve compatibility while moving to semantic naming:
  - `content-box-link` (semantic)
  - `contentBoxLink` (legacy)
- Only emits inline height style when `height` is defined.

## Styling

The component applies:

- `padding: 20px`
- `transition: all 0.2s ease`
- `transform: translateY(-2px)` on hover

Both `.content-box-link` and `.contentBoxLink` selectors are supported.

## Regression and Unit Coverage

`src/components/__tests__/ContentBoxLink.test.ts` covers:

- Route prop forwarding.
- Slot rendering.
- Semantic and legacy class presence.
- Fixed height style generation for valid `height` values.
- Regression case ensuring omitted `height` never renders `undefinedpx`.
- Attribute pass-through to the router-link root.