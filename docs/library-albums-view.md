# Library Albums View

## Scope

src/views/library/albums/albums.vue is the albums listing view for the music library. It provides sorting, search, genre filtering, poster navigation, and album context-menu actions.

## Inconsistencies Fixed in Tests

- Replaced assertion-less/mount-only checks with behavior assertions tied to user-visible outcomes.
- Switched from internals-only invocation style to event-driven interaction contracts where practical.
- Added deterministic mocks for store refs and library fetch payloads to cover real control-flow branches.

## Consolidated Tests

src/views/library/albums/__tests__/albums.test.ts combines unit and regression coverage for:

- mount orchestration contracts (getAlbums, clearSearch, loadGenres, document click listener wiring)
- unmount cleanup contract (document click listener removal)
- poster click navigation contract to album route with query source
- sort contracts (release/artist/random and release-only order toggle guard)
- search change contract through CustomSearchField integration
- genre dropdown visibility/open/close contracts and filter add/remove payload contracts
- context-menu placement, visibility, and click-away close contract
- play-now action contracts (full command sequence, empty-track early return, fetch-failure toast)
- add-to-queue action contracts (enqueue path, failure toast path, empty-response fallback)
- delete action contracts (confirm cancel, missing library guard, success path, API failure path)

## Coverage Result

Focused coverage run for the view file reports:

- 100.0% statements
- 100.0% branches
- 100.0% declarations

## Why This Matters

The albums page contains several side-effectful paths (queue manipulation, destructive delete, and global click handlers). High branch coverage plus interaction-level assertions protects against silent regressions in playback flows, filter controls, and context-menu behavior.
