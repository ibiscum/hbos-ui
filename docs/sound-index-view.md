# Sound Index View

## Scope

src/views/sound/index.vue is the sound section landing page. It renders four navigation tiles that route users to:

- general-sound
- speaker-equalizer
- crossover-design
- room-acoustics

Each tile exposes a title, description, icon, and fixed card height contract.

## Inconsistencies Fixed

- Normalized template formatting in tile declarations:
  - Removed extra spacing before `:height` bindings.
- Normalized script import quoting to single quotes.
- Normalized SCSS block spacing for class selectors.

No behavioral changes were introduced in the view itself.

## Consolidated Tests

src/views/sound/__tests__/sound-index.test.ts combines unit and regression coverage for:

- Page shell rendering and `Sound` title contract.
- Rendering of exactly four sound navigation cards.
- Route-target contracts and ordering for all tiles.
- Icon mapping contracts and ordering.
- Card description presence for all sections.
- Uniform height contract (`150`) across all tiles.
- Uniqueness contract: one tile per expected route.
- Heading-order contract aligned with route progression.
- Presence of the overview grid hook class used by responsive layout styles.

## Why This Matters

The sound index view is a routing hub. Small content or route-key regressions can silently break navigation and make downstream sound tools effectively unreachable. These tests lock structure, ordering, and route contracts so navigation integrity is preserved while the view evolves.
