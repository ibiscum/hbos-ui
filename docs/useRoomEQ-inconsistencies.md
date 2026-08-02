# useRoomEQ.ts - Inconsistencies Review

## Overview
Composable for loading Room EQ configurations into the speaker equalizer. Used in speaker-equalizer component to load and apply pre-configured room equalization filters.

**File**: `/src/composables/useRoomEQ.ts`  
**Lines**: ~150  
**Functions**: 3 exported (useRoomEQ composable), 2 internal (convertRoomEQFilterToSpeakerEQ, loadRoomEQSettings, loadSelectedRoomEQConfig)

---

## Inconsistencies Found

### HIGH PRIORITY

#### 1. ⚠️ ERROR HANDLING INCONSISTENCY (Lines 90-104)
**Severity**: HIGH  
**Category**: Error Handling Pattern  
**Issue**: Different error logging levels based on error message content

```typescript
// Lines 90-104
if (error instanceof Error && error.message.includes('404')) {
  console.log('speaker-equalizer: No Room EQ configurations found (404)');
} else {
  console.error('speaker-equalizer: Failed to load Room EQ configurations:', error);
}
```

**Problem**:
- 404 errors logged with `console.log()` instead of `console.error()`
- Inconsistent error severity signaling
- Difficult for error monitoring/logging to track actual errors
- 404 is legitimate condition (no configs) but treated same as API errors

**Impact**: Error tracking and debugging become unreliable

**Recommendation**: Either:
1. Treat 404 as success (empty list), not error
2. Or use consistent error level for all API failures
3. Or return status/error code for caller to decide

---

#### 2. 🔴 MISSING INDEX IN MAP - Filter ID Generation Bug (Line 123)
**Severity**: HIGH  
**Category**: Code Bug  
**Issue**: Index parameter not passed to conversion function

```typescript
// Line 123 - INCORRECT
const convertedFilters = config.data.filters.map(convertRoomEQFilterToSpeakerEQ);

// Should be:
const convertedFilters = config.data.filters.map((filter, index) => 
  convertRoomEQFilterToSpeakerEQ(filter, index)
);
```

**Problem**:
- `convertRoomEQFilterToSpeakerEQ()` expects `index` parameter (line 43)
- Function uses index to generate unique ID: `id: Date.now() + index`
- Without index, all filters get same ID: `Date.now() + undefined` = `NaN`
- All filters end up with same ID, causing filter list issues

**Impact**: 
- Multiple filters have identical IDs
- UI filter selection/deletion may not work correctly
- Hard to track which filter is which

**Recommendation**: Pass index explicitly in map callback

---

#### 3. 📋 NO VALIDATION OF INTERFACE COMPLIANCE (Lines 81-88)
**Severity**: HIGH  
**Category**: Type Safety  
**Issue**: JSON parsed and cast to type without validation

```typescript
// Line 84-86
const configData = JSON.parse(valueResponse.data.value) as RoomEQConfig;
configs.push({ key, data: configData });
```

**Problem**:
- `JSON.parse()` result cast as `RoomEQConfig` without validation
- Could load configs missing required fields (name, filters, created_at)
- Could load configs with wrong field types
- Type assertion (`as RoomEQConfig`) masks runtime type mismatches

**Impact**:
- Invalid configs passed to `loadSelectedRoomEQConfig()`
- Calling `.map()` on undefined `filters` causes crash
- Silent data corruption in filter loading

**Example**:
```typescript
{ name: 'Test' } // Missing filters, created_at
{ filters: "invalid" } // Wrong type
```

**Recommendation**: 
1. Add runtime validation of parsed JSON
2. Check required fields exist and have correct types
3. Use try-catch around type assertion

---

### MEDIUM PRIORITY

#### 4. ⚠️ RESPONSE STRUCTURE ASSUMPTION (Lines 79-82)
**Severity**: MEDIUM  
**Category**: API Contract Handling  
**Issue**: Assumes response structure without defensive checks

```typescript
// Lines 79-82 - Assumes structure
if (keysResponse.status === 'success' && keysResponse.data && Array.isArray(keysResponse.data)) {
  for (const key of keysResponse.data) {
```

**Problem**:
- Assumes `getConfigKeys()` always returns `{ status, data }` object
- No validation if response format changes
- If API returns different structure, silently fails
- `Array.isArray(keysResponse.data)` check is defensive, but incomplete

**Impact**:
- Breaking change in API silently ignored
- Difficult to debug when API format changes
- Silent empty results instead of error indication

**Recommendation**: 
1. Define response interface for API contracts
2. Validate responses against schema
3. Log warnings when expected structure not found

---

#### 5. 📊 SILENT PARTIAL FAILURE - Filter Adding (Lines 133-137)
**Severity**: MEDIUM  
**Category**: Error Handling  
**Issue**: Errors in individual filter additions not caught

```typescript
// Lines 133-137
for (const [index, filter] of convertedFilters.entries()) {
  await filterStore.addFilter(ch, index, convertUIFilterToStore(filter));
}
```

**Problem**:
- No try-catch inside loop
- If one filter fails, outer catch catches it
- But loop may have partially succeeded (some filters added)
- Inconsistent state: some filters added, some not

**Impact**:
- Partial configuration loads silently
- User sees partial filter set without error indication
- Difficult to debug what happened

**Recommendation**:
1. Add try-catch inside loop
2. Track which filters succeeded/failed
3. Either: fail all on first error, or: report partial success

---

#### 6. 🎯 MODAL STATE NOT CLOSED ON ERROR (Lines 144-147)
**Severity**: MEDIUM  
**Category**: UI State Management  
**Issue**: Modal opened but not closed when loading fails

```typescript
// Line 67 - Modal opened in loadRoomEQSettings
showRoomEQModal.value = true;

// Line 144 - Modal only closed on success
showRoomEQModal.value = false;

// No modal close in error handler (lines 145-147)
```

**Problem**:
- Modal opened at start of `loadRoomEQSettings()`
- Closed only on success in `loadSelectedRoomEQConfig()`
- If loading fails, modal stays open with loading spinner
- User left hanging with no feedback

**Impact**:
- Stuck UI state when errors occur
- User must close modal manually
- Poor error UX

**Recommendation**: Always close modal in finally block or error handler

---

#### 7. 🛑 INCONSISTENT ERROR FEEDBACK - Toast vs Console (Lines 102-104, 145-147)
**Severity**: MEDIUM  
**Category**: Error Notification  
**Issue**: Different notification methods in different functions

```typescript
// loadRoomEQSettings (line 102-104):
} else {
  console.error('speaker-equalizer: Failed to load Room EQ configurations:', error);
}
// No toast shown

// loadSelectedRoomEQConfig (lines 145-147):
} catch (error) {
  console.error('speaker-equalizer: Failed to load Room EQ configuration:', error);
  toastStore.showErrorToast('Error loading Room EQ configuration. Please try again.');
}
```

**Problem**:
- `loadRoomEQSettings()` errors only logged, no user notification
- `loadSelectedRoomEQConfig()` errors show toast to user
- Inconsistent user experience
- Errors may go unnoticed if console hidden

**Impact**:
- Users don't know why config list is empty
- Inconsistent error visibility
- Poor error UX

**Recommendation**: Normalize error notification (toast in both, or both console)

---

#### 8. 📛 CHANNEL VALIDATION - SILENT FAILURE (Lines 125-131)
**Severity**: MEDIUM  
**Category**: Validation  
**Issue**: Invalid channel configuration silently ignored

```typescript
// Lines 125-131
if (targetMode === 'both') {
  channelsToApply.push(...channels);
} else if (targetMode === 'left' && channels.length > 0) {
  channelsToApply.push(channels[0]);
} else if (targetMode === 'right' && channels.length > 1) {
  channelsToApply.push(channels[1]);
}
```

**Problem**:
- If channels array empty and targetMode is 'left', `channelsToApply` stays empty
- Loop doesn't execute, filters not added
- No error or warning to user
- Operation succeeds (returns normally) but does nothing

**Impact**:
- Filters not applied without user knowing
- Confusing behavior

**Recommendation**:
1. Validate channels exist before proceeding
2. Show warning/error if channel not found
3. Or return error status to caller

---

### LOW PRIORITY

#### 9. ⚠️ NO RETURN VALUE - Success/Failure Status (Lines 106-109, 148-151)
**Severity**: LOW  
**Category**: API Design  
**Issue**: Functions return `undefined`, no success/failure status

```typescript
// Both functions return nothing
async function loadRoomEQSettings() {
  // ... no return statement
}

async function loadSelectedRoomEQConfig(...) {
  // ... no return statement
}
```

**Problem**:
- Caller can't know if operation succeeded or failed
- Must observe state changes (showRoomEQModal, roomEQConfigs, etc.)
- Difficult to chain operations
- Testing requires reading multiple state refs

**Impact**:
- Awkward composable API
- Harder to use correctly

**Recommendation**: Return boolean or status object

---

#### 10. 🔄 LOGGING INCONSISTENCY - Different Severity Levels (Lines 88, 102, 145)
**Severity**: LOW  
**Category**: Logging  
**Issue**: Inconsistent logging methods across functions

```typescript
// loadRoomEQSettings uses 3 different levels:
console.log(...)      // Line 88
console.warn(...)     // Line 88
console.error(...)    // Line 102

// loadSelectedRoomEQConfig uses 2 levels:
console.log(...)      // Line 143
console.error(...)    // Line 145
```

**Problem**:
- No consistent logging strategy
- Makes log analysis difficult
- Different error severity signaling

**Impact**:
- Log analysis tools may classify errors inconsistently
- Minor readability/maintainability issue

**Recommendation**: Define logging policy (use console.error for errors, etc.)

---

#### 11. ⏱️ INVALID DATE HANDLING IN SORT (Line 89)
**Severity**: LOW  
**Category**: Edge Case Handling  
**Issue**: Sorting may produce unpredictable results with invalid dates

```typescript
// Line 89
configs.sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());
```

**Problem**:
- `new Date('invalid-string').getTime()` returns `NaN`
- `NaN - NaN` = `NaN`, unpredictable sort behavior
- If config has invalid created_at, sort behavior undefined

**Impact**:
- Configs with invalid timestamps sort unpredictably
- Edge case, but could be confusing

**Recommendation**: Validate dates before sorting, or add fallback

---

#### 12. 🔐 UNSAFE CHANNEL ACCESS (Lines 125-131)
**Severity**: LOW  
**Category**: Defensive Programming  
**Issue**: Assumes channel array indices without validation

```typescript
// Line 127 - No validation that channels[0] exists
channelsToApply.push(channels[0]);

// Line 130 - No validation that channels[1] exists
channelsToApply.push(channels[1]);
```

**Problem**:
- `channels[1]` may be undefined if only 1 channel
- Code checks `channels.length > 1`, but defensive coding could be better

**Impact**:
- Minor, but could add undefined to array
- Defensive check exists, so low severity

**Recommendation**: Could use optional chaining `channels[0]?` for clarity

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| HIGH     | 3     |
| MEDIUM   | 5     |
| LOW      | 4     |
| **TOTAL** | **12** |

---

## Risk Assessment

**Critical Issues** (Blocks functionality):
- Missing index in map → All filters get same ID
- No interface validation → Crashes on invalid config
- Modal not closed on error → Stuck UI

**Important Issues** (Degrades experience):
- No error toast in loadRoomEQSettings → Silent failures
- Channel validation silent → Filters not applied without feedback
- Partial filter failure possible → Inconsistent state

**Nice to Have** (Code quality):
- Return values → Better composable API
- Logging consistency → Better debugging
- Date validation → Edge case handling

---

## Files Referenced

- `/src/composables/useRoomEQ.ts` - Main file (150 lines)
- `/src/api/config.ts` - getConfigKeys, getConfigValue
- `/src/stores/filter_connector.ts` - filterStore
- `/src/stores/toast.ts` - toastStore
- `/src/utils/filter-conversions.ts` - convertUIFilterToStore
- `/src/utils/filter-display.ts` - formatFilterTypeName

---

## Related Components

- `speaker-equalizer` - Component using this composable
- `AddSmbMountDialog.vue` - Similar pattern to review
- Other composables - May have similar inconsistencies

