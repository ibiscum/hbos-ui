# TracksCard.vue Inconsistencies Review

## Summary
TracksCard displays a list of tracks from an album with track playback support. **10 inconsistencies** identified across error handling, type safety, and UX patterns.

---

## HIGH PRIORITY Inconsistencies

### 1. Missing Error Handling in onAddTrackToQueue
**Location**: Lines 110-116 (script)  
**Severity**: HIGH  
**Issue**: 
- Three async operations (`sendCommand('pause')`, `sendCommand('clear_queue')`, `sendLibraryCommand('play')`) have no error handling
- If queue operations fail, user receives no feedback
- Inconsistent with player.ts approach of returning boolean and letting caller handle

**Impact**: Silent failures cause confusing UX where track appears to be queued but isn't playing

**Fix**: Add try-catch block and notify user of success/failure via toast

---

### 2. No Toast Notifications on Queue Action
**Location**: Lines 110-116 (onAddTrackToQueue function)  
**Severity**: HIGH  
**Issue**:
- No success/error toast notifications unlike other interactive components
- Inconsistent with player.ts pattern which uses useToastStore

**Impact**: User doesn't know if track was successfully added to queue

**Suggested Fix**:
```typescript
const toastStore = useToastStore()
// In onAddTrackToQueue after successful operations:
toastStore.showSuccessToast(`Added "${track.name}" to queue`)
```

---

### 3. Missing Null Check for album.artists Array
**Location**: Line 101  
**Severity**: HIGH  
**Issue**:
```typescript
if (album && album.artists && album.artists.length > 0) {
  // This assumes album.artists is never undefined/null
  const albumArtist = album.artists[0]
}
```
- Checks `album.artists` exists, but still accesses `[0]` without verifying array length before access
- Race condition: album could be undefined between check and access

**Impact**: Potential crash if album becomes undefined between conditional check and access

**Fix**: Ensure album is always truthy and artists array is always valid

---

## MEDIUM PRIORITY Inconsistencies

### 4. Unused albumId Prop
**Location**: Line 53 (props definition)  
**Severity**: MEDIUM  
**Issue**:
- `albumId?: string` is declared in TracksProps but never used in component logic
- Suggests incomplete implementation or leftover from refactoring

**Impact**: Misleading API suggests feature that isn't implemented

**Fix**: Remove unused prop or implement albumId usage

---

### 5. No Validation of track.uri Before Adding
**Location**: Line 114 (onAddTrackToQueue)  
**Severity**: MEDIUM  
**Issue**:
- Track type requires `uri: string`, but component doesn't validate it exists
- If Track is missing uri, playerStore.addTrackToQueue will silently fail

**Impact**: Tracks with missing uri added to queue but don't play

**Fix**: Validate track.uri before calling playerStore.addTrackToQueue

---

### 6. Song Comparison Based on Exact String Match
**Location**: Lines 76-85 (isCurrentTrack function)  
**Severity**: MEDIUM  
**Issue**:
```typescript
const titleMatch = track.name === currentSong.value.title
const artistMatch = track.artist === currentSong.value.artist
return titleMatch && artistMatch
```
- Relies on exact string equality which may fail with:
  - Whitespace differences (e.g., "Artist A" vs "Artist A ")
  - Case differences (e.g., "The Beatles" vs "the beatles")
  - Special character differences (e.g., accents: "café" vs "cafe")

**Impact**: Current track highlighting doesn't work for tracks with minor formatting differences

**Fix**: Normalize strings before comparison (trim, lowercase, normalize unicode)

---

### 7. No Empty State Message
**Location**: Template lines 19-38  
**Severity**: MEDIUM  
**Issue**:
- When `loading === false` and `tracks.length === 0`, no message shown
- Users don't know if this is intentional, API error, or loading state

**Impact**: Confusing UI when album has no tracks or API fetch failed silently

**Fix**: Show "No tracks found" message in v-else-if block

---

## LOW PRIORITY Inconsistencies

### 8. Potential Race Condition on Click
**Location**: Line 44 (v-on:click binding)  
**Severity**: LOW  
**Issue**:
- `onAddTrackToQueue` is async but has no debounce/prevent-multiple-calls mechanism
- Rapid clicks could trigger multiple queue operations simultaneously
- No loading state visual feedback during operation

**Impact**: Users can inadvertently add same track multiple times with rapid clicks

**Fix**: Add debounce or disable click handler while operation in progress

---

### 9. Logging Inconsistency
**Location**: Script section  
**Severity**: LOW  
**Issue**:
- No debug logging of operations (add track, current track detection)
- Makes it hard to debug issues in production
- Inconsistent with player.ts which has console.log statements

**Impact**: Harder to diagnose user issues without browser dev tools

**Fix**: Add console.debug() statements for debugging

---

### 10. No Loading State Visual Feedback on Click
**Location**: Lines 110-116 (onAddTrackToQueue)  
**Severity**: LOW  
**Issue**:
- Long-running async operation (sendCommand calls) has no loading indicator
- User might click multiple times thinking first click didn't work

**Impact**: Poor UX with potential for accidental duplicate actions

**Fix**: Add loading state ref, disable click handler, show loading spinner

---

## Type Safety Issues

### Missing Type Imports
- Component imports Track and AlbumDetails from '@/types/library' but this path doesn't exist
- Should import from '@/types/library/track.interface.ts' and '@/types/library/albums.interface.ts'
- Works currently only if there's a barrel export in '@/types/library' index file

---

## Testing Gaps

Current component has no tests. Regression tests should cover:

1. ✅ Current track highlighting with exact name/artist match
2. ✅ Artist display (show only if different from album artist)
3. ✅ Track queue action flow (pause → clear → add → play)
4. ✅ Loading skeleton display
5. ✅ Error handling in queue operations
6. ✅ Empty state handling
7. ✅ Race condition prevention
8. ✅ Toast notification triggers

---

## Summary of Fixes Required

| Priority | Count | Issues |
|----------|-------|--------|
| HIGH | 3 | Error handling, toast notifications, null check safety |
| MEDIUM | 4 | Unused prop, missing validation, string comparison, empty state |
| LOW | 2 | Race condition, logging, loading feedback |
| **TOTAL** | **9** | |

### Recommended Action Plan

1. **Immediate**: Fix HIGH priority issues (error handling, toast, null checks)
2. **Short-term**: Fix MEDIUM issues (validation, comparison, empty state)
3. **Future**: Add LOW priority improvements (debounce, logging, loading feedback)
