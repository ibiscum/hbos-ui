# Extensions View

Behavior contract and consolidated test coverage for the services view at `src/views/services/extensions.vue`.

## Scope

This view provides extension catalog discovery and package actions:

- list extension catalog entries
- search and category filtering
- refresh catalog job kickoff
- install and uninstall job kickoff
- progress dialog with phase, progress, log, and failure details
- optional route-driven auto-install (`?install=<package>`)

## Consistency Fixes Applied

### Full dialog state reset on close and failure paths

The dialog state now resets consistently in all exit paths:

- `closeDialog()` clears `dialogOpen`, `dialogExtension`, and `showLog`
- install failure path clears `dialogExtension` and `showLog` when closing
- uninstall failure path clears `dialogExtension` and `showLog` when closing

Why this matters:

- avoids stale dialog metadata from bleeding between operations
- keeps dialog lifecycle symmetric for success, manual close, and failure

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/extensions.test.ts`

### Unit coverage

- renders page shell, toolbar, and fetched cards
- shows loading state while list request is in-flight
- shows load error copy when list request fails
- filters by search and category, including empty-filter result state
- refresh action tracks returned job and disables refresh while running

### Regression coverage

- install flow opens dialog, tracks job, and toggles log visibility
- install failure closes dialog and surfaces toast error
- uninstall flow opens dialog and tracks returned job
- watcher reloads catalog when tracked job reaches done
- route query auto-installs only when requested package exists and is not already installed
- route query does not auto-install already installed package
- dialog renders failure and reboot-required copy from tracked job state

## Notes for Future Changes

- Keep route-query auto-install behavior aligned with catalog loading timing.
- If additional job phases are introduced, ensure dialog copy remains coherent for both active and terminal phases.
- If action UX changes (inline progress vs modal), update both watch-based reload assertions and job state visibility tests.
