# PipeWire Filter Chain View

Behavior contract and consolidated tests for the services view at `src/views/services/pipewire-filter-chain.vue`.

## Scope

This view displays the PipeWire filtergraph and supports two representations:

- Graph visualization (rendered via `d3-graphviz`)
- Raw DOT text view

It also provides retry behavior for both fetch and graph rendering failures.

## Consistency Fixes Applied

### 1. Align view shell with services navigation pattern

The view now uses `PageContent` with title and services back link, matching other service views.

### 2. Fix graph auto-render lifecycle race

Graph auto-render previously ran while `loading` was still true, before the graph container was mounted. Rendering now occurs only when:

- view mode is `graph`
- DOT content exists
- loading has completed
- graph is not already rendering

This prevents silent first-render skips.

### 3. Fix retry-render recovery path

The graph container is now always mounted in graph mode and conditionally hidden for loading/error overlays.

Why this matters:

- Retry render can now succeed after a graph parsing/rendering failure.
- Previously, retry attempted render with a null container and could not recover.

### 4. Clear stale graph data state on fetch failure

Failed fetch paths now clear `filterChain` and `graphError` to avoid stale visualization state leaking across retries.

## Consolidated Unit + Regression Tests

Test file: `src/views/services/__tests__/pipewire-filter-chain.test.ts`

### Unit coverage

- page shell renders with expected title/back link
- loading state renders while request is in flight
- empty state renders for successful empty DOT data
- raw view toggle displays DOT content

### Regression coverage

- auto-render executes after successful load completion
- graph re-renders when switching raw -> graph
- API `status: error` path renders error and supports retry
- thrown fetch error path renders error state
- graph render failure shows render error and retry render recovers

## Notes for Future Changes

- Keep graph rendering side effects tied to mounted container availability.
- If graph rendering becomes async/event-driven, update tests to assert completion events rather than immediate calls.
- If the view shell changes away from `PageContent`, preserve an explicit navigation/back-link contract in tests.
