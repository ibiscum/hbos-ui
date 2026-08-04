# AudioControls.vue Test Consolidation Summary

Location: [src/components/AudioControls.vue](../src/components/AudioControls.vue)
Test file: [src/components/__tests__/AudioControls.test.ts](../src/components/__tests__/AudioControls.test.ts)
Date: 2026-08-04

## Scope

The test file was consolidated to remove assertion-light checks and replace them with behavior-focused unit and regression tests.

## What Changed

- Replaced repetitive structure-only tests with direct behavior assertions.
- Unified test setup around deterministic stateful mocks.
- Split the suite into clear categories:
  - unit: rendering and state binding
  - unit: control actions
  - regression: lyrics overlay behavior
- Standardized stubs for IconButton and LyricsOverlay so icon/title/disabled bindings are verifiable.

## Inconsistencies Fixed in Test File

- Removed unused imports and setup noise.
- Removed tests that only asserted component existence after actions.
- Replaced weak checks with explicit assertions for:
  - button visibility by mode (`isOnSticky`)
  - button disabled conditions from capabilities and command/checking flags
  - icon/title switching for play/pause and loop modes
  - heart title and icon states across favorite provider scenarios
  - click dispatch to composable/store actions
  - lyrics overlay state transitions and null-song guard path

## Current Coverage Result

Command used:

```bash
pnpm vitest run src/components/__tests__/AudioControls.test.ts --coverage --coverage.include=src/components/AudioControls.vue
```

Result:

- Tests: 11/11 passing
- Statements: 100%
- Lines: 100%
- Functions: 100%
- Branches: 97.77%

## Notes

- Remaining uncovered branch is a minor conditional path that does not affect validated user-critical flows.
- The suite now emphasizes regression protection for interactive behavior rather than DOM-presence checks.
