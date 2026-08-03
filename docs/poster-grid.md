# PosterGrid

## Overview

`PosterGrid.vue` renders paginated or row-limited poster collections and provides a consistent click/context-menu contract for library views.

Component file: `src/components/PosterGrid.vue`
Tests file: `src/components/__tests__/PosterGrid.test.ts`

## Props Contract

- `items: T[]` list of poster-ready items (`T extends PosterItem`).
- `loading?: boolean` shows skeleton placeholders when true.
- `loaded?: boolean` enables empty-state messaging when true and `items` is empty.
- `inRow?: boolean` switches layout from multi-row grid to row-focused presentation.
- `posterForm?: 'circle' | 'square'` forwarded to `Poster` and `PosterSkeleton`.
- `showAll?: boolean` disables chunk pagination and renders all items immediately.

## Events

- `click(item)` emitted when a poster card is activated.
- `contextmenu(item, event)` emitted when user opens the context menu on a poster item.

## Rendering and Data Loading Behavior

### Loading and Item Rendering

- While `loading` is true, `PosterSkeleton` is rendered.
- Otherwise, each rendered item is wrapped in `.poster-item` with `data-id` from `$id`.
- Poster fields are safely mapped with empty-string fallbacks:
  - `title <- $title`
  - `subtitle <- $subtitle`
  - `note <- $note`
  - `src <- $cover_src`

### Incremental Loading

When `showAll` is false and `inRow` is false, items are loaded in viewport-based chunks:

- very large screens: `100`
- large screens: `80`
- default: `50`

Additional chunks are appended when scrolling near page bottom (1000px buffer).

### Row Mode Limit

When `inRow` is true, the component renders only the calculated number of visible cards:

- desktop (`>= 960px`): one row, width-based cap
- mobile (`< 960px`): two-row cap with smaller card width assumptions

### Empty States

When `loaded` is true and `items` is empty:

- if library store reports updating (`isLibraryUpdating`), show an updating status card with loading icon
- otherwise show generic text: `No available items found`

## Regression and Unit Coverage

`src/components/__tests__/PosterGrid.test.ts` covers:

- skeleton rendering and note-awareness forwarding
- chunked loading in grid mode with scroll-triggered append
- `showAll` behavior bypassing pagination
- row-mode item cap calculation
- click and context-menu event payload contracts
- library-updating empty-state rendering with `Icon` prop wiring regression (`icon="loading"`)
- generic empty-state messaging when no update is in progress
