# Theaudiodb

## Overview

Theaudiodb is a service-status card for TheAudioDB connectivity. On mount, it performs a single health-check request and renders one of three states:

- Checking
- Active
- Unavailable

Component file: `src/components/Theaudiodb.vue`
Tests file: `src/components/__tests__/Theaudiodb.test.ts`

## Props

- title: string, default TheAudioDB
- description: string, default TheAudioDB is used to retrieve additional artist images and biographies
- icon: string, default tabler/database
- serviceKey: string, default theaudiodb

## Request Contract

The component sends:

- URL: https://www.theaudiodb.com/api/v1/artist.php?i=112024
- Method: GET
- Timeout: 5000 ms via AbortController

A response is considered available only when artists exists, is an array, and has at least one item.

## State Model

Internal state:

- isLoading
- isAvailable
- errorMessage

Derived UI state:

- statusText: Checking..., Active, Unavailable
- statusBadgeClass: status-badge yellow, green, red

## Lifecycle and Cleanup

- A health-check starts in onMounted.
- Starting a new check aborts the previous in-flight check.
- onBeforeUnmount aborts active requests and clears timers.
- Stale request responses are ignored with a request-id guard.

This prevents race-condition updates and post-unmount state writes.

## Accessibility

- Status badge uses role=status and an aria-label formatted as:
  - {title} service status: {statusText}
- Error message uses role=alert.
- Decorative dot icon uses aria-hidden=true.

## Exposed API

The component exposes:

- checkServiceStatus(): Promise<void>

This allows parent-triggered retries and deterministic regression tests.

## Error Handling

- HTTP failures produce Failed to check status: HTTP {status}
- Abort/timeout failures produce Failed to check status: Request timed out
- Other failures produce Failed to check status: {message}

Non-abort errors are logged as:

- [{serviceKey}] Service health check failed:

## Regression and Unit Coverage

`src/components/__tests__/Theaudiodb.test.ts` covers:

- Default rendering and prop wiring.
- Initial mount health-check contract.
- Success state rendering and accessibility label.
- HTTP failure rendering and logging behavior.
- Timeout regression message and loading-state completion.
- In-flight request replacement (new check aborts previous check).
- Unmount cleanup (active request aborted with no error logging side effect).
