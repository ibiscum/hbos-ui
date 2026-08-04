# Room Acoustics View

## Scope

src/views/sound/room-acoustics.vue provides the room measurement and room-equalisation workflow. It covers:

- launching the room measurement wizard
- listing saved room measurements with response previews
- listing saved Room EQ configurations with filter-response previews
- deleting saved measurements and configurations
- selecting target channel(s) and routing to speaker equalizer with apply parameters

## Inconsistencies Fixed

- Preview-path robustness for flat measurements:
  - `generatePreviewPath` now handles equal min/max magnitudes by using a centered y-position.
  - This prevents invalid SVG path values (`NaN`/`Infinity`) for constant-magnitude datasets.
- Removed unused `.room-acoustics-page` style block to reduce dead styling.

## Consolidated Tests

src/views/sound/__tests__/room-acoustics.test.ts combines unit and regression coverage for:

- page shell and empty-state rendering
- measurement/config list rendering from store and config APIs
- configuration sort order by creation date (newest first)
- measurement wizard open/complete flow with list refresh
- measurement-card selection flow opening equalisation wizard
- propagation guard: measurement delete button does not trigger card-open behavior
- channel-selection dialog open + selected-channel route push contract
- propagation guard: configuration delete button does not open selection dialog
- Room EQ filter-type mapping into speaker-eq preview filter icons
- regression guard ensuring finite SVG preview paths for flat measurements

## Why This Matters

Room acoustics is a multi-step flow that combines persistence, preview rendering, and cross-view routing. Small regressions in event propagation, data parsing/sorting, or preview math can silently break critical UX paths. These tests lock those contracts and protect edge cases while allowing future feature work.
