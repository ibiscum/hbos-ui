# Add Filter Modal

## Scope

src/components/speaker-eq/AddFilterModal.vue is the filter-type picker modal used by the speaker equalizer and crossover design views before creating a new filter.

## Inconsistencies Fixed

- Normalized teleport component casing to Teleport for consistency with other Vue SFC modal components.
- Removed redundant static class array binding in favor of a direct class attribute.
- Added explicit type="button" on each filter option button to avoid implicit submit behavior when rendered inside form-like containers.
- Normalized helper copy punctuation to Select a filter type.

## Consolidated Tests

src/components/speaker-eq/__tests__/AddFilterModal.test.ts combines unit and regression coverage for:

- open/closed rendering contract
- title/helper copy contract
- filter option count and rendered order contract
- filter-display utility integration for icon and label mapping
- add event payload contract by selected filter type
- close behavior contract (backdrop closes, modal content does not)
- button type contract to prevent submit regressions

## Why This Matters

Add Filter Modal is a narrow but high-frequency interaction in EQ workflows. Regressions in event payloads, option ordering, or accidental submit semantics can create subtle filter creation bugs. This suite locks the modal contract while keeping the parent view tests focused on integration flow.
