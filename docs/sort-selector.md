# SortSelector

## Purpose

`SortSelector` renders sort controls for the albums page and emits events to update sort state in the parent/store.

## Props

- `sortBy`: `'release_date' | 'artist'`
- `sortOrder`: `'asc' | 'desc'`

## Emitted Events

- `sort-by-change` with payload `'release_date' | 'artist'`
- `toggle-order` with no payload

## Behavior

- Clicking `Year` always emits `sort-by-change` with `release_date`.
- Clicking `Year` while `sortBy === 'release_date'` additionally emits `toggle-order`.
- Clicking `Artist` emits `sort-by-change` with `artist` and never emits `toggle-order`.
- The caret icon is only shown when `sortBy === 'release_date'`.
- The caret icon points up for ascending order and down for descending order.

## Integration Notes

- Random/shuffle sorting is intentionally handled outside `SortSelector` (in the albums view via a dedicated shuffle button).
- Consumers should listen with kebab-case events: `@sort-by-change` and `@toggle-order`.
