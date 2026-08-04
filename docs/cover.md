# Cover Component

## Overview

`Cover.vue` is a small presentational component that renders album artwork when available and falls back to a placeholder icon when artwork is missing, loading, or failed.

Component file: `src/components/Cover.vue`
Test file: `src/components/__tests__/Cover.test.ts`

## Props

### `src`
- Type: `string`
- Default: `''`
- Description: Image URL to render.

### `alt`
- Type: `string`
- Default: `''`
- Description: Alternate text for the image.

### `delay`
- Type: `number`
- Default: `0`
- Description: Delay passed to VueUse `useImage` image loading behavior.

## Rendering Rules

The component computes two states:

- `hasSrc`: true when `src.trim().length > 0`
- `showPlaceholder`: true when any of the following are true:
  - `!hasSrc`
  - `isLoading`
  - `error`

### Placeholder mode (`showPlaceholder === true`)

- Root element gets class `no-img`.
- Placeholder `Icon` is shown.
- Icon variant:
  - `loading` while `isLoading` is true
  - `music` for missing or failed image
- `<img>` is not rendered.

### Image mode (`showPlaceholder === false`)

- `<img>` is rendered with:
  - `src` from internal `imageOptions.src`
  - `alt` from prop
  - `loading="lazy"`
- Transition animation `app-cover--fade` is applied to image changes.

## Regression Notes

The component now treats empty `src` as a guaranteed placeholder state instead of relying on image loader behavior. This prevents empty-image rendering regressions.

## Test Coverage Summary

`src/components/__tests__/Cover.test.ts` covers:

- Empty `src` placeholder behavior (regression)
- Successful image rendering with `src` and `alt`
- Loading placeholder (`loading` icon)
- Error placeholder (`music` icon)
- Reactive update when `src` changes
- Forwarding of `delay` option to `useImage`
