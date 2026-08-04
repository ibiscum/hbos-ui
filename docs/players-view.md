# Players View

Behavior contract and consolidated test coverage for the services view at `src/views/services/players.vue`.

## Scope

This view manages built-in and external player services:

- service status discovery and existence checks
- filtering by expert mode (hide non-installed unless enabled)
- toggling service state for regular services
- TOSLink status and sensitivity configuration
- external player settings update and save
- navigation affordance to Bluetooth settings

## Consistency Fixes Applied

### 1. Route-name navigation consistency

Bluetooth navigation now uses route-name navigation (`{ name: 'bluetooth-settings' }`) instead of a hard-coded path string.

Why this matters:

- aligns with route contracts used in other service views
- avoids path drift risk when route paths change but names remain stable

### 2. External settings save failure no longer collapses config

External player config remains expanded when `saveExternalPlayerSettings` fails.

Why this matters:

- users can correct settings and retry without re-opening config
- failure feedback stays visible in context

### 3. TOSLink save failure now surfaces player-level error and keeps config open

When TOSLink sensitivity save fails, the error is written to `player.error` and config remains expanded.

Why this matters:

- avoids silent failure states
- prevents losing in-progress settings context on save errors

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/players.test.ts`

### Unit coverage

- renders page shell and semantic header copy
- hides non-installed built-in/external players when expert mode is off
- shows hidden players in expert mode and keeps external player sort order alphabetical
- bluetooth navigation emits named-route push
- config expansion and cancellation state contract

### Regression coverage

- active regular service toggle calls disable path and refreshes status
- forbidden toggle (403) surfaces not-allowed error copy
- external save failure keeps config expanded and exposes error
- external save success persists settings and closes config
- TOSLink sensitivity save failure keeps config expanded and exposes error

## Notes for Future Changes

- If player ordering strategy changes, update sort/filter contract tests explicitly.
- If external settings types expand beyond toggle/select, add save payload contract checks per type.
- Keep service refresh after toggle as a post-condition so UI reflects backend truth.
