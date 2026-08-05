# Library Artist Album View

## Scope

src/views/library/albums/artist-album.vue renders the artist-focused album page, combining artist profile metadata, optional MusicBrainz details, image selection flows, and artist-context album navigation.

## Test Refinement

The previous suite mixed structural checks with assertion-light internals. It has been refined into behavior-driven unit/regression tests that validate branch outcomes from user and data-flow paths.

## Consolidated Tests

src/views/library/albums/__tests__/artist-album.test.ts now covers:

- mount orchestration (artist preload guard, albums fetch, metadata fetch, conditional MusicBrainz fetch)
- mount error handling contract
- rendering branches:
  - extended MusicBrainz section (loading, error, data)
  - basic metadata section (without MBID)
  - fallback artist-id section
- computed contracts:
  - image URL rewrite and image-error fallback
  - biography truncation/expansion behavior
  - unique genre normalization and deduplication
- watcher contracts:
  - image-error reset when artist changes
  - MBID watcher fetch behavior (and no-refetch guard)
  - biography watcher length re-evaluation
- interaction contracts:
  - mobile info toggle
  - biography toggle in both extended and basic paths
  - image selector open/close/select flow
  - poster click navigation to album route with artist query context and empty fallback
- image update outcome branches:
  - missing artist name guard
  - success toast path
  - failed response path
  - thrown error path

## Coverage Result

Focused coverage run for this file reports:

- 100.0% statements
- 100.0% branches
- 100.0% declarations

## Why This Matters

This view coordinates multiple asynchronous sources and conditional rendering paths. Full branch coverage prevents regressions in artist metadata display, navigation context propagation, and image-update side effects.
