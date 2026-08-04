# System Tools View

Behavior contract and consolidated test coverage for the services view at `src/views/services/system-tools.vue`.

## Scope

This view provides high-impact maintenance actions:

- factory reset workflow with destructive confirmation
- sound-card auto-detect and confirmation-based configuration
- fixed sound-card selection and save flow
- reboot follow-up workflow after card configuration changes
- stop-all-players action for emergency playback reset
- expert mode toggle through settings store updates

## Consistency Fixes Applied

### 1. Stop-all-players card now uses its dedicated semantic class

The Stop All Music Players card now uses `stop-players-tool` instead of `reset-tool`.

Why this matters:

- the stylesheet already defines dedicated icon styling for this card type
- previous class mismatch prevented the intended visual semantics from applying

### 2. Sound-card list load now handles non-success payloads explicitly

`loadSoundCards()` now surfaces API-declared failure (`status !== success`) through an error toast.

Why this matters:

- previously only thrown errors were surfaced; non-success payloads failed silently
- users now get actionable feedback when card inventory could not be loaded

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/system-tools.test.ts`

### Unit coverage

- renders page shell/back-link and all tool sections
- loads sound-card options on startup with display-name transforms
- preselects configured fixed card when auto-detection is disabled
- preserves semantic class contract for Stop All Players card

### Regression coverage

- non-success sound-card list payload shows explicit error toast
- reset confirmation flow executes config reset + detection re-enable
- detect -> confirm -> configure flow uses dtoverlay endpoint and opens reboot dialog
- fixed-card save path calls disable-detection API and respects reboot-required flow
- auto-detect save path re-enables detection and confirms reboot requirement
- expert mode toggle updates store and reports success
- stop-all-players false result surfaces failure toast

## Notes for Future Changes

- Keep dialog flows deterministic: each confirm/cancel path should leave card state and toasts explicit.
- If sound-card API expands with richer failure payloads, pass through user-safe details in toasts.
- Preserve semantic tool-card classes when refactoring card layout so existing style contracts remain intact.
