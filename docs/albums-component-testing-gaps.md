# Albums Component - Testing Gaps & Inconsistencies Analysis

## Executive Summary
The `albums.vue` component has 33 tests covering rendering, sorting, filtering, and user interactions. However, the test suite contains **critical testing gaps** and uses **weak assertion patterns** that fail to validate actual component behavior. Key issues: (1) many tests don't assert behavior, (2) error paths untested, (3) async state flags never verified, (4) edge cases missing, (5) type safety problems with excessive `any` casts.

**Test Count**: 33 tests in `src/views/library/albums/__tests__/albums.test.ts`
**Coverage Issues**: ~40% of functionality lacks proper behavior verification

---

## Critical Testing Gaps

### 1. ❌ Assertion-less Tests
Multiple tests check element existence or wrapper existence without asserting expected behavior:

**Location**: Lines 152-158, 167-173, 178-184, 189-195, 202-208
```typescript
// WEAK: Doesn't verify sort selector actually received the call
it('renders controls bar with sort selector', async () => {
  // ... setup ...
  expect(wrapper.find('.controls-bar').exists() || wrapper.vm).toBeTruthy()  // ❌ Bad pattern
})

// WEAK: "||wrapper.vm" always truthy, doesn't test anything
it('renders search field', async () => {
  expect(wrapper.find('.search-bar').exists() || wrapper.vm).toBeTruthy()  // ❌ Bad pattern
})
```

**Issue**: `wrapper.vm` is always truthy, so if `.exists()` is false, the test still passes. This defeats the purpose of assertions.

**Recommendation**: 
```typescript
// ✅ BETTER: Assert the actual element exists or fail
it('renders search field', async () => {
  const Albums = await import('@/views/library/albums/albums.vue')
  const wrapper = mount(Albums.default, { /* ... */ })
  
  // Assert element actually exists
  expect(wrapper.find('.search-bar').exists()).toBe(true)
})
```

**Affected Tests** (Lines ~152-208):
- "renders page content with title"
- "renders controls bar with sort selector"
- "renders search field"
- "renders shuffle button"
- "renders genre dropdown only when genres exist"
- "renders poster grid with albums"

**Risk**: Silent failures - tests could pass even when UI doesn't render correctly.

---

### 2. ❌ No Tests for Error Paths
Component catches errors in 3 async operations, but NO tests verify error handling works:

**Locations in Component** (`albums.vue`):
```typescript
// Line ~145: playNow() catch block
try {
  // ... play logic ...
} catch {
  toastStore.showErrorToast('Failed to play album')  // ← NEVER TESTED
}

// Line ~165: addToQueue() catch block  
try {
  // ... add logic ...
} catch {
  toastStore.showErrorToast('Failed to add album to queue')  // ← NEVER TESTED
}

// Line ~185: deleteAlbum() catch block
try {
  // ... delete logic ...
} catch {
  toastStore.showErrorToast('Failed to delete album')  // ← NEVER TESTED
}
```

**Test File Response** (Lines 825-861):
The test file has documentation tests that only verify the code *contains* "catch" and "showErrorToast":
```typescript
it('playNow has try-catch error handling', () => {
  // Documents that playNow catches errors and shows error toast
  const codeExample = `...catch (err)...showErrorToast...`
  expect(codeExample).toContain('catch (err)')  // ❌ Not testing actual error handling
  expect(codeExample).toContain('showErrorToast')
})
```

**What's Missing**:
- ❌ No test that actually triggers an error in `fetchAlbumTracks`
- ❌ No test verifying error toast is shown when fetch fails
- ❌ No test verifying context menu closes after error
- ❌ No test verifying loading flags are cleared on error

**Recommendation**:
```typescript
it('playNow shows error toast when fetchAlbumTracks fails', async () => {
  const { usePlayerStore } = await import('@/stores/player')
  const { useToastStore } = await import('@/stores/toast')
  const playerStore = usePlayerStore()
  const toastStore = useToastStore()
  
  const Albums = await import('@/views/library/albums/albums.vue')
  const wrapper = mount(Albums.default, { /* ... */ })
  
  const vm = wrapper.vm as any
  vm.contextMenu.albumId = 'album-error'
  
  // Mock fetchAlbumTracks to throw error
  vi.spyOn(vm, 'fetchAlbumTracks').mockRejectedValue(new Error('API error'))
  
  await vm.playNow()
  
  // ✅ VERIFY: Error toast was called
  expect(toastStore.showErrorToast).toHaveBeenCalledWith('Failed to play album')
  
  // ✅ VERIFY: Context menu closed despite error
  expect(vm.contextMenu.visible).toBe(false)
  
  // ✅ VERIFY: Loading flag cleared
  expect(vm.isPlayingNow.value).toBe(false)
})
```

---

### 3. ❌ No Tests for Loading State Flags
Component manages 3 loading flags (`isPlayingNow`, `isAddingToQueue`, `isDeletingAlbum`) but NO tests verify they're set correctly:

**Component Code** (albums.vue):
```typescript
const isPlayingNow = ref(false)
const isAddingToQueue = ref(false)
const isDeletingAlbum = ref(false)

const playNow = async (): Promise<void> => {
  isPlayingNow.value = true  // ← Set true when starting
  try { ... }
  catch { ... }
  finally { isPlayingNow.value = false }  // ← Set false when done
}
```

**Test File**: NO ASSERTIONS about loading flags

**What's Missing**:
- ❌ No test verifying `isPlayingNow` is true during fetch
- ❌ No test verifying `isPlayingNow` is false after completion
- ❌ No test verifying flags don't get stuck true if error occurs
- ❌ No test for `isAddingToQueue` and `isDeletingAlbum` flags

**Risk**: If loading flag management breaks, UI doesn't disable buttons/show loaders properly.

**Recommendation**:
```typescript
it('playNow sets loading flag during execution and clears it after', async () => {
  const Albums = await import('@/views/library/albums/albums.vue')
  const wrapper = mount(Albums.default, { /* ... */ })
  
  const vm = wrapper.vm as any
  vm.contextMenu.albumId = 'album-123'
  
  let isPlayingNowDuringFetch = false
  vi.spyOn(vm, 'fetchAlbumTracks').mockImplementation(async () => {
    isPlayingNowDuringFetch = vm.isPlayingNow.value  // ← Capture value during execution
    return []
  })
  
  expect(vm.isPlayingNow.value).toBe(false)  // Initially false
  
  await vm.playNow()
  
  // ✅ VERIFY: Flag was true during fetch, now false after
  expect(isPlayingNowDuringFetch).toBe(true)
  expect(vm.isPlayingNow.value).toBe(false)
})
```

---

### 4. ❌ No Tests for Edge Cases

#### Edge Case 1: Empty Album Tracks
Component checks `if (!tracks.length) return` but this is never tested:

**Component Code** (Line ~145):
```typescript
const tracks = await fetchAlbumTracks(albumId)
if (!tracks.length) return  // ← NEVER TESTED
```

**What's Missing**:
- ❌ No test verifying early return when tracks empty
- ❌ No test verifying no queue operations occur on empty tracks

**Recommendation**:
```typescript
it('playNow returns early if album has no tracks', async () => {
  const Albums = await import('@/views/library/albums/albums.vue')
  const wrapper = mount(Albums.default, { /* ... */ })
  
  const vm = wrapper.vm as any
  vi.spyOn(vm, 'fetchAlbumTracks').mockResolvedValue([])  // Empty tracks
  
  const playerStoreSpies = {
    sendCommand: vi.fn(),
    sendLibraryCommand: vi.fn(),
  }
  
  await vm.playNow()
  
  // ✅ VERIFY: No player commands called
  expect(playerStoreSpies.sendCommand).not.toHaveBeenCalled()
  expect(playerStoreSpies.sendLibraryCommand).not.toHaveBeenCalled()
})
```

#### Edge Case 2: No Active Library
Component checks `if (!activeLibrary.value)` in deleteAlbum:

**Component Code** (Line ~180):
```typescript
if (!activeLibrary.value) {
  toastStore.showErrorToast('No library selected')  // ← NEVER TESTED
  return
}
```

**What's Missing**:
- ❌ No test for null/undefined activeLibrary
- ❌ No test verifying error toast shown
- ❌ No test verifying function returns early

#### Edge Case 3: Context Menu Album ID
No test verifies what happens when `contextMenu.albumId` is empty string:

**Recommendation**:
```typescript
it('playNow handles empty albumId gracefully', async () => {
  const Albums = await import('@/views/library/albums/albums.vue')
  const wrapper = mount(Albums.default, { /* ... */ })
  
  const vm = wrapper.vm as any
  vm.contextMenu.albumId = ''  // Empty!
  
  vi.spyOn(vm, 'fetchAlbumTracks').mockResolvedValue([])
  
  // Should not throw
  expect(() => vm.playNow()).not.toThrow()
})
```

---

### 5. ❌ Weak Context Menu Navigation Test
The "navigates to album on poster click" test doesn't actually verify navigation:

**Location**: Lines 793-810
```typescript
it('navigates to album on poster click', async () => {
  const routerPushSpy = vi.spyOn(router, 'push')

  const Albums = await import('@/views/library/albums/albums.vue')
  mount(Albums.default, { /* ... */ })

  // ❌ Problem: routerPushSpy is cleared but never used!
  routerPushSpy.mockClear()
  // ❌ Test ends here - no actual click event fired
})
```

**What's Missing**:
- ❌ No actual click event on poster grid
- ❌ No assertion that router.push was called
- ❌ No verification of router params (albumId, from: 'albums')

**Recommendation**:
```typescript
it('navigates to album details on poster click', async () => {
  const routerPushSpy = vi.spyOn(router, 'push')
  
  const Albums = await import('@/views/library/albums/albums.vue')
  const wrapper = mount(Albums.default, { /* ... */ })
  
  const vm = wrapper.vm as any
  
  // Simulate PosterGrid emitting click event
  const testAlbum = { id: 'album-123', name: 'Test Album' }
  vm.$emit = vi.fn()  // or use wrapper.emitted()
  
  // Manually call the handler (since PosterGrid is stubbed)
  vm.router.push({ 
    name: 'album', 
    params: { albumId: testAlbum.id }, 
    query: { from: 'albums' } 
  })
  
  // ✅ VERIFY: Correct route parameters
  expect(routerPushSpy).toHaveBeenCalledWith({
    name: 'album',
    params: { albumId: 'album-123' },
    query: { from: 'albums' }
  })
})
```

---

### 6. ❌ Try-Catch Error Variables Never Used
Component catches errors but never reads them:

**Component Code** (Line ~149):
```typescript
try {
  // ...
} catch {  // ← No error variable captured
  toastStore.showErrorToast('Failed to play album')
}
```

**Test File** (Line 850):
```typescript
it('error variables are unused (err vs _err)', () => {
  // Documents inconsistency: catch blocks use 'err' but never read it
  // Should use '_err' to indicate intentionally unused
  expect(true).toBe(true) // Documents the pattern
})
```

**Issue**: This is documented but not actually enforced. Should either:
- Use the error in error message: `showErrorToast(error.message)`
- Or use `catch (_err)` to signal intentionally unused

---

### 7. ❌ No Tests for Event Listener Cleanup
Event listener tests don't verify behavior:

**Test** (Lines 765-792):
```typescript
it('adds click listener on mount', async () => {
  const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
  // ... mount component ...
  expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
})

it('removes click listener on unmount', async () => {
  const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
  // ... mount and unmount ...
  expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
})
```

**What's Missing**:
- ❌ No test verifying the listener callback actually works
- ❌ No test verifying context menu closes on document click
- ❌ No test verifying genre dropdown closes on document click
- ❌ No test that listener is never called after unmount (memory leak detection)

---

### 8. ❌ Genre Filter Tests Are Weak
Genre filter tests don't verify state changes:

**Test** (Lines 374-390):
```typescript
it('toggles genre selection', async () => {
  // ... setup ...
  const vm = wrapper.vm as any
  expect(() => {
    try {
      vm.toggleGenre('Rock')
    } catch {
      // Expected with mocks
    }
  }).not.toThrow()  // ❌ Only tests it doesn't throw
})
```

**What's Missing**:
- ❌ No assertion that selectedGenres was updated
- ❌ No assertion that setGenreFilter was called
- ❌ No test for toggling same genre twice (toggle off)
- ❌ No test verifying UI reflects genre count

**Recommendation**:
```typescript
it('toggles genre selection on and off', async () => {
  const { useAlbumStore } = await import('@/stores/album')
  const albumStore = useAlbumStore()
  albumStore.genres.value = ['Rock', 'Pop']
  albumStore.selectedGenres.value = []

  const Albums = await import('@/views/library/albums/albums.vue')
  const wrapper = mount(Albums.default, { /* ... */ })
  
  const vm = wrapper.vm as any
  
  // Toggle genre on
  vm.toggleGenre('Rock')
  expect(albumStore.setGenreFilter).toHaveBeenCalledWith(['Rock'])
  
  // Toggle genre off
  vm.toggleGenre('Rock')
  expect(albumStore.setGenreFilter).toHaveBeenCalledWith([])
})
```

---

## Summary Table

| Testing Gap | Severity | Type | Count |
|---|---|---|---|
| Weak assertions (|| wrapper.vm pattern) | HIGH | Pattern | 6 tests |
| Error paths untested | CRITICAL | Behavior | 3 paths |
| Loading flags not verified | HIGH | State | 3 flags |
| Edge cases missing | HIGH | Coverage | 5+ cases |
| Event listener cleanup untested | MEDIUM | Behavior | 2 tests |
| Genre filter incomplete | MEDIUM | Behavior | 2 tests |
| Navigation test incomplete | MEDIUM | Behavior | 1 test |
| Error variable usage inconsistent | LOW | Code Quality | Pattern |

---

## Type Safety Issues

All interaction tests use `as any` to bypass TypeScript:
```typescript
const vm = wrapper.vm as any  // ❌ Used 11 times
```

**Impact**: No compile-time safety for method calls, parameter validation.

**Recommendation**: Create proper test interface for component:
```typescript
interface AlbumsTestComponent {
  playNow(): Promise<void>
  addToQueue(): Promise<void>
  deleteAlbum(): Promise<void>
  handleSortByChange(sort: 'release_date' | 'artist' | 'random'): void
  toggleGenre(genre: string): void
  contextMenu: { visible: boolean; albumId: string; x: number; y: number }
  isPlayingNow: { value: boolean }
  isAddingToQueue: { value: boolean }
  isDeletingAlbum: { value: boolean }
}

const vm = wrapper.vm as unknown as AlbumsTestComponent
```

---

## Recommendations Priority

1. **CRITICAL** (Do first):
   - [ ] Fix weak assertions (6 tests)
   - [ ] Add error path tests (3 paths)
   - [ ] Add loading flag tests (3 flags)

2. **HIGH** (Do next):
   - [ ] Add edge case tests (5+ cases)
   - [ ] Fix genre filter tests (2 tests)
   - [ ] Fix navigation test (1 test)

3. **MEDIUM** (Do eventually):
   - [ ] Add event listener behavior tests (2 tests)
   - [ ] Fix error variable consistency
   - [ ] Improve type safety

---

## Related Files
- Component: `/src/views/library/albums/albums.vue`
- Tests: `/src/views/library/albums/__tests__/albums.test.ts`
- Store: `/src/stores/album.ts` (reviewed previously)
- Types: `/src/types/library/albums.interface.ts` (reviewed previously)
