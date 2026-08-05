# Bluetooth Settings Modal

## Scope

src/components/BluetoothSettings/BluetoothSettingsModal.vue handles passkey entry for Bluetooth pairing requests triggered by the Bluetooth settings flow.

## Inconsistencies Fixed

- Normalized title text from "Pincode" to "Passkey" to match variable names and backend endpoint semantics.
- Added local passkey sanitization helper (digits only, capped to 6).
- Added HTTP status guard for passkey submit so modal only closes on successful responses.
- Reset passkey state on close to prevent stale values when reopening.
- Scoped styles and button types to avoid accidental global button styling/submit behavior.

## Consolidated Tests

src/components/BluetoothSettings/__tests__/BluetoothSettingsModal.test.ts combines unit and regression coverage for:

- Open/closed rendering contract.
- Passkey sanitization rules and enter-button enablement.
- Close action contract (emit update and clear local state).
- Successful submit contract (request payload and modal close).
- Failure contracts (non-ok and rejected requests must not close the modal).

## API Contract

- Endpoint: POST /bluetooth/passkey
- Headers: Content-Type application/json
- Body: { "passkey": "123456" }
- Success behavior: close modal and clear passkey.
- Failure behavior: keep modal open and preserve user input for retry.

## Why This Matters

This modal is the user’s final step in PIN-based pairing. Input hygiene and strict close behavior are important to avoid hidden regressions, failed pairing retries, and stale passkey state leaking across modal sessions.
