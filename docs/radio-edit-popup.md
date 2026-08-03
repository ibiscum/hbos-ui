# RadioEditPopup Component

## Overview

The `RadioEditPopup` component provides an edit dialog for saved radio favorites. It allows updating station name, stream URL, optional country/tags, and custom station image.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isVisible` | `boolean` | Yes | Controls popup visibility |
| `station` | `RadioFavorite \| null` | Yes | Station to edit; when null, the form is reset |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | None | Emitted on overlay click, close button, or cancel button |
| `save` | `RadioFavorite` | Emitted after validation when the form is submitted |

## Data Mapping Rules

When the popup opens with a station:

1. Title and URL come from `station.title` and `station.url`.
2. Country/tags prefer `station.metadata` and fall back to legacy `station.country` / `station.tags`.
3. Image preference order is:
   1. `station.metadata.logo_url`
   2. `station.metadata.coverart_url`
   3. `station.img`

When saving, the emitted payload keeps both modern and legacy fields synchronized:

- `metadata.title`, `metadata.country`, `metadata.tags`
- `metadata.logo_url` and `metadata.coverart_url` (both set from the current image)
- Legacy fields: `img`, `country`, `tags`

## Validation

The popup validates required fields after trimming:

- Station name must be non-empty.
- Stream URL must be non-empty.

If validation fails, no `save` event is emitted and an error toast is shown.

## Image Upload Behavior

Upload constraints:

- Only MIME types starting with `image/` are accepted.
- Maximum file size is 5 MB.

On invalid upload:

- The file input is reset.
- A toast error is shown.
- The current preview image remains unchanged.

On valid upload:

- A `FileReader` converts the file to a data URL.
- Preview updates immediately.

## Regression Coverage

Unit and regression tests are implemented in:

- `src/components/__tests__/RadioEditPopup.test.ts`

Covered cases include:

- Rendering and form prefill behavior
- Metadata and legacy fallback ordering for image/country/tags
- Save payload trimming and synchronization
- Required field validation guard
- Draft reset across close/reopen cycles
- Invalid and valid image upload flows
