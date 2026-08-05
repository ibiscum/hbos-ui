# Room EQ Loader Modal

## Scope

src/components/speaker-eq/RoomEqLoaderModal.vue handles Room EQ preset selection and channel-target selection before applying a preset in the speaker equalizer flow.

## Inconsistencies Fixed

- Normalized teleport component casing to Teleport for consistency with other speaker-eq modal components.
- Added explicit button semantics and close-button accessibility label.
- Reworked selection tracking to key-based selection instead of object identity to avoid stale/highlight mismatches after config refreshes.
- Added state reset on modal close so stale selected config and channel mode do not leak into a later open session.
- Added invalid date fallback copy (Unknown date) for malformed metadata.
- Added guarded load emitter so no load event is emitted without a valid selection.

## Consolidated Tests

src/components/speaker-eq/__tests__/RoomEqLoaderModal.test.ts combines unit and regression coverage for:

- open/closed rendering contract
- loading and empty states
- config list rendering and metadata copy
- invalid date fallback behavior
- selection state and selected-class contract
- load button enabled/disabled behavior
- channel mode payload contract (including explicit both-mode reselection)
- close behavior contracts (overlay self, close button, cancel button)
- stale selection reset on close/reopen
- stale selection cleanup when config list refresh removes selected key
- button semantics/accessibility contract

## Why This Matters

Room EQ application is a high-impact action that can rewrite filter sets quickly. Regressions in selection state, payload routing, or stale modal state can apply incorrect presets to the wrong channel scope. These tests lock critical interaction contracts and keep parent view tests focused on orchestration.
