# Speaker Equalizer View

## Scope

src/views/sound/speaker-equalizer.vue is the interactive speaker EQ editor. It provides:

- per-channel filter graph editing
- linked/individual channel operation mode
- filter add/remove and parameter controls
- temporary bypass controls
- EQ load/save actions
- Room EQ import path through the Room EQ loader modal

## Inconsistencies Fixed

- Normalized boolean prop binding:
  - Updated PageContent binding from `:headerHasContentBelow=true` to `:headerHasContentBelow="true"`.
- Fixed Space-key bypass modal guard symmetry:
  - `keydown` already blocked bypass while Room EQ modal was open.
  - `keyup` now applies the same Room EQ modal guard, preventing unintended bypass-end handling while modal UI is active.

## Consolidated Tests

src/views/sound/__tests__/speaker-equalizer.test.ts combines unit and regression coverage for:

- page shell title and back-link contracts
- backend metadata, tabs, graph, and filter-list rendering
- add-filter modal flow and add delegation
- Room EQ modal open and load delegation
- query-parameter driven Room EQ apply flow on mount
- Escape-key modal close precedence across add/backend/room-eq modals
- Space-key bypass suppression when Room EQ modal is open
- active-channel watcher refresh contract for backend capabilities
- keyboard listener cleanup on unmount

## Why This Matters

Speaker equalizer is the core high-interaction sound editor and is coupled to backend state, keyboard shortcuts, and modal workflows. Regressions in modal precedence, keyboard handling, or query-driven Room EQ application can silently produce unsafe control behavior or user confusion. These tests lock core interaction contracts and the restored keyboard-guard consistency.
