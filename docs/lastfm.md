# Lastfm

## Overview

Lastfm is the web-service integration card for Last.fm authentication and connection state.
It manages a request-token based auth flow, periodic completion polling, connection status checks, and disconnection.

Component file: `src/components/Lastfm.vue`
Tests file: `src/components/__tests__/Lastfm.test.ts`

## UI States

The card renders one primary action state at a time:

- Connect: shown when not connected and auth is not in progress
- Disconnect: shown when connected
- Cancel: shown while auth polling is in progress

Status badge state:

- Green: connected
- Red: connection error
- Gray: not connected

Optional sections:

- Settings section (collapsed by default)
- Authentication progress section (when polling)
- Error section (when an error message is present)

## Auth Flow

1. User clicks Connect.
2. Component calls `startLastFMAuth()`.
3. On success, request token is persisted in localStorage as `lastfm_request_token`.
4. Component calls `prepareLastFMAuthCompletion(token)`.
5. Browser opens Last.fm auth page in a new tab.
6. Component starts a 5-second polling loop calling `completeLastFMAuth()`.
7. On authenticated response, token/session flags are cleared and the component transitions to connected state.

## Persistence and Recovery

- localStorage key: `lastfm_request_token`
- sessionStorage key: `lastfm_auth_in_progress`

During status checks, if the backend reports unauthenticated and a stored request token exists, the component attempts to resume auth preparation and polling.

## Lifecycle Behavior

- onMounted:
  - Loads settings if needed.
  - Clears stale session auth flag.
  - Checks current Last.fm status.
- onUnmounted:
  - Stops auth polling timer.

## Settings Integration

The component reads Last.fm service settings from `useSettingsStore()`:

- `scrobble`
- `manageFavourites`

Settings controls are currently rendered disabled in the UI.

## Error Handling

The component handles three categories:

- API payload errors (for example, missing auth URL/token)
- API completion errors returned by backend
- thrown runtime/network errors

Errors are surfaced in the error section and reflected by red badge status.

## Regression and Unit Coverage

`src/components/__tests__/Lastfm.test.ts` covers:

- Initial render and disconnected status contract.
- Settings bootstrapping when store was not loaded.
- Connected-state rendering from status check.
- Connect flow request contract and popup launch behavior.
- Invalid auth-start payload error rendering.
- Auth-session abort behavior and storage cleanup.
- Stored-token session-resume behavior.
- Regression: reconnect remains enabled after successful auth polling and later disconnect.

## Consistency Fix Applied

A stale in-memory `isConnecting` state could persist after successful auth transition, causing the Connect action to remain disabled after disconnect.

Fix: when auth polling starts, `isConnecting` is reset, so polling owns the in-progress state and reconnect remains available after disconnect.
