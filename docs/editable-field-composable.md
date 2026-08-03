# Editable Field Composable

## File

- src/composables/useEditableField.ts

## Purpose

useEditableField provides reusable inline editing state and save behavior for reactive values.

useEditableText is a specialization for string inputs with required/min/max validation.

## API

### useEditableField

- input:
- initialValue: Ref<T | null | undefined>
- updateFunction: (newValue: T) => Promise<{ status: 'success' | 'error'; message?: string }>
- options:
- validator?: (value: T) => boolean
- transformer?: (value: string) => T
- defaultValue?: T

- output:
- isEditing
- editValue
- isSaving
- editError
- startEditing()
- cancelEditing()
- saveEdit(): Promise<boolean>
- canSave(): boolean

### useEditableText

- input:
- initialValue: Ref<string | null | undefined>
- updateFunction: (newValue: string) => Promise<{ status: 'success' | 'error'; message?: string }>
- options:
- minLength?: number
- maxLength?: number
- required?: boolean

## Behavior Contract

1. startEditing initializes editValue from current value, or defaultValue when current is null/undefined.
2. Falsy values are preserved when stringified.
- Examples: 0 becomes "0", false becomes "false".
3. saveEdit and canSave first normalize the raw value.
- If trimmed input is non-empty, use trimmed input.
- Otherwise, use defaultValue when provided.
- Otherwise, use empty string.
4. saveEdit applies transformer then validator.
- Invalid or transform-failed values do not call updateFunction.
- updateFunction failures are surfaced via editError.
5. useEditableText trims before validating and updating.

## Inconsistencies Fixed

1. Falsy default/current values now behave correctly.
- Before: 0 default/current values were treated as empty due truthy checks.
- Now: nullish checks preserve valid falsy values.

2. Empty-input behavior is validator-driven.
- Before: base composable always rejected empty input when no default, even when higher-level validation allowed it.
- Now: required/optional semantics are consistently controlled by validator (for useEditableText, by required option).

3. Transformer failure handling is safe.
- Before: transformer exceptions could escape from saveEdit and canSave paths.
- Now: errors are handled and converted to safe false/error outcomes.

## Tests

- src/composables/__tests__/useEditableField.test.ts

Coverage includes:

1. Falsy current/default value regression cases.
2. Empty input with numeric default value.
3. Required empty value rejection path.
4. Transformer exception handling.
5. Update failure and fallback error messaging.
6. useEditableText trim + min/max validation.
7. useEditableText required=false empty-save behavior.
