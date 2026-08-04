# Extension Sources View

Behavior contract and test coverage for the services view at `src/views/services/extension-sources.vue`.

## Scope

The view manages two independent source registries used by the extensions subsystem:

- APT extension sources
- GitHub release sources (`owner/name`)

It supports list, add, and remove operations for both registries and renders high-risk security warnings near both add forms.

## Consistency Fixes Applied

### 1. Explicit GitHub loading state

`loadGithub()` now tracks a dedicated `ghLoading` state with `try/finally` and the UI shows `Loading GitHub sources…` while the request is in-flight.

Why this matters:

- Prevents false empty-state flashes (`No GitHub sources configured.`) during slow responses.
- Aligns GitHub list behavior with the existing APT loading experience.

### 2. Submit-time GitHub repo validation

`onAddGithub()` now validates a trimmed repository value against `owner/name` format before calling the API:

- Input is trimmed once and reused for API + success toast.
- Invalid values are blocked and surfaced via toast: `Repository must be in owner/name format.`

Why this matters:

- Keeps behavior correct in non-browser or mocked test environments where native HTML pattern checks are bypassed.
- Prevents malformed source creation requests from reaching backend APIs.

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/extension-sources.test.ts`

### Unit coverage

- Renders page shell (`Extension sources`) and expected back link (`extensions`)
- Renders fetched APT and GitHub source entries
- Renders empty states for both lists
- Adds an APT source and refreshes list
- Shows GitHub loading copy during in-flight list request

### Regression coverage

- APT remove path is blocked when confirmation is declined
- APT remove path succeeds when confirmation is accepted and triggers reload
- GitHub add path trims whitespace before API call
- Invalid GitHub repo format is blocked before API call
- Initial load failures for APT and GitHub are surfaced via error toasts
- GitHub remove path is blocked when confirmation is declined

## Notes for Future Changes

- Keep APT and GitHub list lifecycles symmetric (loading/error/empty/success states).
- If the GitHub repo format changes, update both:
  - UI input `pattern`
  - Script-level `githubRepoPattern` validation
  - Regression tests that verify pre-API validation behavior
