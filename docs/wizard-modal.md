# WizardModal Component

## Overview

`WizardModal.vue` is the shared shell component used by multi-step wizards in the UI. It provides:

- Modal open/close behavior
- A title and body slot
- Step indicator (`Step X of Y`)
- Previous/Next navigation buttons
- Final action button with optional loading state

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | - | Controls whether the modal is rendered |
| `title` | `string` | Yes | - | Header title text |
| `currentStep` | `number` | Yes | - | Current step number |
| `totalSteps` | `number` | Yes | - | Total number of steps |
| `canProceedNext` | `boolean` | No | `true` | Disables Next when `false` |
| `nextLabel` | `string` | No | `'Next'` | Custom label for Next button |
| `finalLabel` | `string` | No | `'Save'` | Custom label for final button |
| `finalIcon` | `string` | No | `'checkmark'` | Custom icon for final button |
| `savingFinal` | `boolean` | No | `false` | Disables final button and shows loading icon |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | None | Emitted when overlay or close button is clicked |
| `previous` | None | Emitted when Previous is clicked |
| `next` | None | Emitted when Next is clicked |
| `finish` | None | Emitted when final action is clicked |

## Behavior Rules

- Overlay click closes the modal (`@click.self`), while clicks inside content do not.
- Previous button is shown only when `currentStep > 1`.
- Next button is shown only when `currentStep < totalSteps`.
- Final button is shown only when `currentStep >= totalSteps`.
- While `savingFinal` is `true`, final action is disabled and displays `tabler/loader`.

## Implementation Notes

Recent consistency updates:

- Added `type="button"` to all modal action buttons to prevent accidental form submissions when the modal is used inside a `<form>`.
- Switched navigation/loading icons to existing assets:
  - Previous: `tabler/chevron-left`
  - Next: `tabler/chevron-right`
  - Loading: `tabler/loader`
- Added `aria-label="Close modal"` on the close button for improved accessibility.

## Test Coverage

Unit/regression tests are in `src/components/__tests__/WizardModal.test.ts` and cover:

- Open/closed rendering
- Title/slot/step indicator rendering
- Close behavior for overlay and close button
- Previous/Next/Finish event emission
- Disabled states for Next and Finish
- Default/custom labels and icons
- Regression check for non-submit button types
