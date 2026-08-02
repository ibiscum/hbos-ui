# DSP Toolkit Store - Purpose, Flow & Inconsistencies

## Store Purpose

The DSP toolkit store in [src/stores/dsp-toolkit.ts](src/stores/dsp-toolkit.ts) manages DSP availability checks with cache-aware status tracking.

It provides:
- cached DSP status checks,
- runtime availability helpers (`canUseDSP`),
- backend error fallback signaling.

## Data Flow

checkDSPStatus
→ return cached status when valid and not forced
→ otherwise call backend status probe
→ update status/lastChecked
→ update checking lifecycle flag

canUseDSP
→ calls checkDSPStatus
→ allows DSP operations only when status is `yes`

## Inconsistencies Identified and Fixed

### 1. Concurrent checks could clear isChecking too early

Issue:
- `isChecking` was a plain boolean toggled true at start and false in each call's finally.
- With concurrent checks, completion of the first call set `isChecking` false even if another check was still in progress.

Fix:
- Added in-flight operation counting (`checkingOperations`).
- `isChecking` is now true while one or more checks are active, and false only when all checks settle.

## Regression Test Coverage

Regression tests added in [src/stores/__tests__/dsp-toolkit.regression.test.ts](src/stores/__tests__/dsp-toolkit.regression.test.ts) cover:
- `isChecking` remains true until all concurrent checks complete,
- thrown backend checks return and store `backend_error` while resetting checking state.

Status:
- DSP toolkit regression suite passes.
- Full project suite passes after fixes.
