# Toast Store - Purpose, Flow & Inconsistencies

## Store Purpose

The toast store in [src/stores/toast.ts](src/stores/toast.ts) is a thin notification wrapper around `vue3-toastify` for consistent user feedback across the app.

It centralizes UI notification entry points for success, error, and info messages.

## Data Flow

show*Toast(message)
→ normalize input message
→ if message is empty after normalization, no-op
→ dispatch to corresponding `vue3-toastify` toast method

## Inconsistencies Identified and Fixed

### 1. Unnormalized toast messages

Issue:
- Messages were sent as-is, including leading/trailing whitespace.

Fix:
- Added shared message normalization (`trim`) before dispatch.

### 2. Empty/whitespace notifications were emitted

Issue:
- Empty strings or whitespace-only messages still produced toasts.

Fix:
- Added guard to skip toast dispatch for empty normalized messages.

### 3. Inconsistent error-toast call signature

Issue:
- Error toasts were called with a redundant empty options object (`toast.error(message, {})`).

Fix:
- Simplified to consistent single-argument dispatch (`toast.error(message)`).

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/toast.regression.test.ts](src/stores/__tests__/toast.regression.test.ts) cover:
- message trimming for success/error,
- empty-message suppression for info/error,
- normalized dispatch behavior.

Status:
- Toast regression suite passes.
- Full project suite passes after fixes.
