# Security View

Behavior contract and consolidated test coverage for the services view at `src/views/services/Security.vue`.

## Scope

This view manages authentication policy for settings changes:

- status load and session/auth indicators
- first-time password setup and existing password change
- policy scope selection (`risky` or `all`) and disable action (`off`)
- session logout action
- API error mapping to user-readable security feedback

## Consistency Fixes Applied

### 1. First-time password success message is now stable

The success copy is now derived from pre-submit state (`hadPassword`) instead of post-request status.

Why this matters:

- avoids showing `Password changed.` immediately after first-time setup
- keeps UX text aligned with the user’s intent in the current action

### 2. Logout flow no longer risks leaving UI busy on refresh failure

`onLogout` now handles refresh failures inside a nested `try/catch/finally` so busy state always resets.

Why this matters:

- prevents stuck disabled controls when best-effort status refresh fails
- keeps logout behavior resilient during transient backend errors

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/security.test.ts`

### Unit coverage

- renders shell/back-link and security status copy
- shows load error copy when initial status refresh fails
- enforces password-form enablement rules (match + current password when required)
- maps auth API password errors to human-readable messages

### Regression coverage

- first-time password setup keeps `Password set...` success copy even after status updates
- existing password change passes `current` password and returns `Password changed.`
- unauthenticated policy change prompts auth before applying policy
- declined auth prompt prevents policy mutation
- turn-off action writes `off` policy
- logout path always clears busy state even when refresh fails after logout attempt

## Notes for Future Changes

- If protection labels change, update both status copy and tests to keep semantic consistency.
- Keep policy mutation gated by the shared auth prompt so behavior matches other risky settings flows.
- If password complexity rules are introduced, extend `canSavePassword` tests with explicit invalid cases.
