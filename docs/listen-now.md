# ListenNow

## Overview

`ListenNow.vue` is a compact action component that emits a click event for parent-controlled playback flows (for example, album playback in `AlbumDetailsCard`).

Component file: `src/components/ListenNow.vue`
Tests file: `src/components/__tests__/ListenNow.test.ts`

## Public Contract

- No props.
- Emits: `click`

The component is intentionally presentation-focused and delegates behavior to its parent.

## Markup and Behavior

- Renders a single `button.app-listen-now` root element.
- Uses explicit `type="button"` to prevent implicit submit behavior when used inside forms.
- Displays:
  - an icon slot area with `Icon` configured as `play`
  - a visible label: `Listen Now`
- On user click, emits `click` once per activation.

## Styling Notes

- Horizontal layout using flex with icon + text.
- Icon is circular and scales on hover.
- Text underline transitions from transparent to link-colored on hover.

## Regression and Unit Coverage

`src/components/__tests__/ListenNow.test.ts` covers:

- Label and play icon rendering.
- Click emission contract.
- Regression guard for `type="button"` semantics.
