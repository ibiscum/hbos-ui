# SecurityPrompt

## Purpose

`SecurityPrompt.vue` is the authentication modal used by the auth flow when protected operations require user confirmation.

It is rendered globally in `App.vue` and is driven by `authStore.promptOpen` and `authStore.promptHint`.

## Modes

The prompt has two UI modes based on `promptHint`:

1. `login`
- Title: `Enter your password`
- Confirm action: `Unlock`
- Cancel action: `Cancel`
- Password metadata: label `Password`, `autocomplete="current-password"`

2. `set-password`
- Title: `Protect your settings`
- Confirm action: `Set a password`
- Secondary action: `Not now`
- Password metadata: label `New password`, `autocomplete="new-password"`

## Actions

### Confirm (`onSubmit`)

- Guard: does nothing if password is empty or a request is already in flight.
- `login` mode: calls `authStore.login(password, remember)`.
- `set-password` mode: calls `authStore.setPassword(password, undefined, remember)`.
- On success: resolves prompt with `authStore.resolvePrompt(true)`.

Error mapping:
- `AuthApiError` status `401` => `Wrong password. Please try again.`
- `AuthApiError` status `429` => `Too many attempts. Please wait a moment and try again.`
- Other errors => surface original message.

### Not now (`onNotNow`)

Available only in `set-password` mode.

- Guard: ignored while busy.
- Calls `authStore.setPolicy('off')`.
- Resolves with success (`resolvePrompt(true)`) so the triggering action can continue without protection.

### Cancel and close

- Cancel button and backdrop click call `resolvePrompt(false)`.
- While busy, cancellation is blocked.
- Close button is disabled while busy to reflect that blocked state.

## State reset behavior

Whenever the prompt transitions to open:

- password is cleared
- remember checkbox is cleared
- error message is cleared
- busy state is reset
- input is focused on the next tick

This prevents stale errors or previously typed credentials from leaking into a new prompt session.

## Test coverage

`src/components/__tests__/SecurityPrompt.test.ts` covers:

- mode-specific rendering and button/label text
- mode-specific autocomplete metadata
- submit flow for login and set-password
- auth error mapping for `401` and `429`
- cancel and backdrop behavior
- not-now flow (`setPolicy('off')` + resolve success)
- busy-state regression: cancellation blocked and close button disabled while request is pending
- reopen regression: form state and errors reset between prompt sessions
