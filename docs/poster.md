# Poster Component

## Overview

`src/components/Poster.vue` renders a reusable poster card with:

- image or placeholder icon
- primary and secondary text
- optional note text

It is used by poster-grid style views to render albums, artists, and other media entities in a consistent card shape.

Related tests: `src/components/__tests__/Poster.test.ts`

## Props Contract

- `title?: string` primary display text and image alt text fallback
- `subtitle?: string` secondary display text
- `note?: string` optional tertiary metadata row
- `src?: string` image source URL/path
- `posterForm?: 'square' | 'circle'` image shape selector

Default values are empty strings for text and image source, with `posterForm` defaulting to `square`.

## Rendering Behavior

### Image and Placeholder

The component delegates loading/error detection to `useImage` from `@vueuse/core` using:

- source ref object `{ src }`
- options `{ delay: 0 }`

When `error` is truthy:

- image is hidden
- placeholder styling is applied (`.placeholder`)
- icon is selected by form:
  - `users-thin` for `circle`
  - `notebook-thin` for `square`

When `src` is an empty string, the component also renders the same placeholder state instead of an `<img>` element.

When no error is present, the `<img>` element is rendered with `loading="lazy"`.

### Text Rows

- title and subtitle are always rendered inside `CustomMarquee`
- note row is conditional (`v-if="note"`)

This keeps optional metadata hidden when empty while preserving stable layout for required text rows.

## Styling Notes

- root class: `.poster`
- image container classes: `.poster-img`, optional `.circle`, optional `.placeholder`
- attribute container: `.poster-attr`
- typography rows: `.h4`, `.h5`, and optional `.note`

Hover transitions apply color updates and image zoom for non-placeholder poster states.

## Regression and Unit Coverage

`src/components/__tests__/Poster.test.ts` validates:

- successful image rendering and alt/text output
- note row suppression when note is empty
- square placeholder icon selection on error
- circle placeholder icon selection on error
- reactive src updates without remount (regression check)
- `useImage` initialization options (`{ delay: 0 }`) and source wiring
