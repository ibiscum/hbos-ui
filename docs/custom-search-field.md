# Custom Search Field

## Overview

CustomSearchField is a reusable search input wrapper used across library and radio views.

Component file: src/components/CustomSearchField.vue
Tests file: src/components/__tests__/CustomSearchField.test.ts

## Props Contract

- modelValue: string current input value for v-model.
- type?: string native input type.
- required?: boolean forwards to native required attribute.
- debounce?: number debounce delay in milliseconds for emitted updates.
- placeholder?: string native input placeholder.

Defaults:

- modelValue: ''
- type: 'text'
- required: false
- debounce: 0
- placeholder: 'Search'

## Emitted Events

- update:modelValue(value: string)
- change(value: string)

Behavior:

- With debounce = 0, events emit immediately on each input event.
- With debounce > 0, events are delayed and coalesced to the latest value.
- Clear button emits empty-string values for both events.

## Rendering Contract

- Wrapped in ContentBox.
- Input is always rendered.
- When modelValue is empty:
  - search icon is shown.
  - clear button is hidden.
- When modelValue is non-empty:
  - clear button is shown.
  - search icon is hidden.

## Consistency and Safety Notes

- Input values are emitted exactly as typed; whitespace is not trimmed in the component.
- Clear button is type="button" to avoid accidental form submission side effects.
- Debounce behavior updates when debounce prop changes at runtime.

## Regression Coverage

The suite in src/components/__tests__/CustomSearchField.test.ts validates:

- default and explicit input props
- icon and clear-button toggling
- immediate and debounced event behavior
- whitespace preservation in emitted values
- debounce-delay updates after prop changes
- clear-button event contract
