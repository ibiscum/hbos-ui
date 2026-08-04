# Music Files View

Behavior contract and consolidated tests for the services view at `src/views/services/music-files.vue`.

## Scope

This view manages SMB/CIFS music share visibility and control flows:

- list configured SMB mounts
- show mount summary and mounted/unmounted status
- expand mount details
- remove mounts with confirmation
- open and react to Add SMB Mount dialog events
- trigger MPD library rescan
- render loading, empty, and error states

## Consistency Fixes Applied

### 1. Prevent stale summary/list state after failures

When mount list loading fails (API `status: error` or thrown error), the view now clears:

- `mounts`
- `mountsSummary`

This prevents stale summary/count and stale rows from being shown alongside an error state.

### 2. Prevent stale summary on remove failures

When remove operation fails, `mountsSummary` is cleared so stale counts are not retained after a failed mutation.

### 3. Fix non-matching mobile style selector

Responsive SCSS previously nested under `.music-files` did not match any DOM node in this component. The media-query block now correctly targets `.music-files-content` directly.

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/music-files.test.ts`

### Unit coverage

- renders page shell and static service information copy
- shows loading state while list request is in flight
- renders successful mount list and summary
- renders empty state when no mounts exist
- expands and collapses mount details table

### Regression coverage

- handles API `status: error` path and retry workflow
- handles thrown fetch error path
- add dialog open/close flow and `mount-created` refresh
- remove flow with confirmation accepted/declined
- remove warning info-toast path
- rescan success path (endpoint + success toast)
- rescan failure path (error toast)

## Notes for Future Changes

- Keep mount summary visibility tied to valid list state; avoid showing stale counts during errors.
- If the rescan endpoint changes, update both implementation and test assertion together.
- If details rendering changes from table to cards, keep explicit expand/collapse contract tests to preserve interaction behavior.
