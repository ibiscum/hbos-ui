# ConfirmationDialog

## Overview

`ConfirmationDialog` is a reusable modal used for destructive or high-impact actions.
It supports optional icon display, danger styling, and required text confirmation.

Component file: `src/components/ConfirmationDialog.vue`
Tests file: `src/components/__tests__/ConfirmationDialog.test.ts`

## Props

- `isOpen` (`boolean`, required): Controls dialog visibility.
- `title` (`string`, required): Dialog heading.
- `message` (`string`, required): Message body split into non-empty lines by `\n`.
- `confirmButtonText` (`string`, default: `Confirm`): Confirm button label.
- `cancelButtonText` (`string`, default: `Cancel`): Cancel button label.
- `isDangerous` (`boolean`, default: `false`): Applies danger style to confirm button.
- `icon` (`string | undefined`): Optional icon name for `Icon` component.
- `requiresTextConfirmation` (`boolean`, default: `false`): Enables typed confirmation input.
- `confirmationText` (`string`, default: `CONFIRM`): Required exact value for typed confirmation.
- `disabled` (`boolean`, default: `false`): Disables confirm action.
- `hideCancelButton` (`boolean`, default: `false`): Hides cancel button when true.

## Emits

- `close`: Triggered by close button, cancel button, or overlay click.
- `confirm`: Triggered when confirm action passes all guards.

## Behavior Notes

- Message rendering is plain text line-by-line; HTML is not interpreted.
- Lines containing `CRITICAL WARNINGS:` get the `critical-warning` CSS class.
- User typed confirmation input is cleared on close and after successful confirm.

## Regression Fixes

Recent fixes in `ConfirmationDialog`:

1. Confirm action now respects `disabled` in all paths, including Enter key submit in the text input.
2. Message line keys are now stable for repeated text lines.
3. Message content is rendered as text (not raw HTML), preventing accidental markup injection.

## Unit and Regression Coverage

`src/components/__tests__/ConfirmationDialog.test.ts` covers:

- Visibility and rendering conditions.
- Default and custom button behavior.
- `close` emit paths (close button, cancel button, overlay).
- Modal click isolation (content click does not close).
- Confirm emit flow and text confirmation guard.
- Input reset behavior on confirm and close/reopen.
- Disabled-state behavior, including Enter-key regression case.
- Critical warning class assignment.
- Non-HTML message rendering behavior.
- Hidden cancel button behavior.
