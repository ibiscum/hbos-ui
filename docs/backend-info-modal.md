# Backend Info Modal

## Scope

src/components/speaker-eq/BackendInfoModal.vue presents backend metadata and description content used in the speaker equalizer and crossover design views.

## Inconsistencies Fixed

- Normalized teleport component casing to Teleport for consistency with the speaker-eq modal set.
- Added explicit type="button" to the close action to prevent implicit submit behavior.
- Added an accessible close-button label for screen readers.
- Added graceful fallback copy when backend description content is unavailable.

## Consolidated Tests

src/components/speaker-eq/__tests__/BackendInfoModal.test.ts combines unit and regression coverage for:

- open/closed rendering contract
- backend-name title rendering contract
- fallback title and empty-description contract for missing capabilities
- fallback description contract for empty backendDescription
- overlay self-close behavior contract
- close-button event contract
- close-button semantics/accessibility contract

## Why This Matters

Backend metadata is informational but operationally important for troubleshooting filter behavior. This modal contract prevents regressions where users cannot close the modal, receive blank unexplained UI, or lose context about the active backend.
