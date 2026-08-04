# Setup View

## Scope

src/views/setup.vue implements the first-run setup wizard for system name, sound card, music sources, security policy, and setup completion.

## Inconsistencies Fixed

- Fixed reboot reachability probe timer cleanup so timeout handles are always cleared, including failed and aborted probes.
- This prevents timer accumulation during reboot polling loops and makes reboot wait behavior more deterministic.

## Consolidated Tests

src/views/__tests__/setup.test.ts combines unit and regression coverage for:

- Mount-time system and auth status initialization.
- Step 1 to Step 2 transition and sound-card detection loading.
- Manual sound-card browse switch from autodetect panel.
- Security-step proceed gating (password and confirmation must match).
- Security commit before summary transition.
- Final setup completion flow (completeSetup, markSetupCompleted, now-playing navigation).
- Setup rerun path when password already exists.

## Why This Matters

The setup wizard is a critical first-run flow. Regressions can leave devices misconfigured or block onboarding. These tests protect both linear happy-path behavior and high-risk rerun/security edge cases while the timer fix improves robustness during reboot handoff.
