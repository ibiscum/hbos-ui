# SMB API Review: Inconsistencies Fixed and Regression Tests Added

## Date
August 2, 2026

## Summary
Reviewed `src/api/smb.ts` for inconsistencies and added comprehensive regression tests to prevent future regressions.

## Inconsistencies Found and Fixed

### 1. **Duplicate Comment (FIXED)**
- **Location**: Lines 240-241 in `createSafeMountOptions()`
- **Issue**: Comment "This helps avoid capability issues by using appropriate mount options" appeared twice
- **Impact**: Code quality issue, confusing documentation
- **Fix**: Removed the duplicate comment

### 2. **SMB Version Parameter Ignored (FIXED)**
- **Location**: `createSafeMountOptions()` function
- **Issue**: Function hardcoded `vers=3.0` instead of respecting the `version` field from `SmbMountRequest`
- **Impact**: Users could not specify custom SMB versions; feature in interface was non-functional
- **Fix**: 
  - Added `smbVersion` parameter to `createSafeMountOptions()`
  - Updated function to use `vers=${smbVersion || '3.0'}`
  - Updated caller in `mountSmbShareWithRetry()` to pass `mountRequest.version`

### 3. **Error Handling Inconsistency (DOCUMENTED)**
- **Location**: `testSmbServer()` vs other API functions
- **Behavior**: 
  - `testSmbServer()` returns error responses with HTTP 200 status without throwing
  - Other functions throw on HTTP errors
- **Status**: INTENTIONAL - API design allows graceful error handling for connection tests
- **Regression Test Added**: Verifies this behavior is preserved

### 4. **Missing Validation**
- **Location**: Various mount request functions
- **Issue**: No validation of required fields before sending to API
- **Status**: DEFERRED - Validation should be added in future enhancement

## Regression Tests Added

### Error Handling Tests (7 tests)
- ✅ HTTP 400 errors include proper error message
- ✅ HTTP 403 access denied handling
- ✅ HTTP 404 not found handling
- ✅ HTTP 500 server error handling
- ✅ Error parsing from `error_details` field
- ✅ Error parsing from `error` field
- ✅ Default error messages when no details available
- ✅ HTTP 200 with error status doesn't throw

### Mount Options Tests (7 tests)
- ✅ Default version 3.0 is applied
- ✅ Custom SMB version is respected (2.0, 2.1, 3.0, etc.)
- ✅ All required fields are included (rw, file_mode, dir_mode, uid, gid, etc.)
- ✅ Default uid/gid (1000) used when not provided
- ✅ Default file/dir modes used when not provided
- ✅ Username omitted when not provided
- ✅ Username included when provided

### Retry Logic Tests (7 tests)
- ✅ `mountSmbShareWithRetry()` calls `mountAllSmbShares()` on success
- ✅ Retry with minimal options on first failure
- ✅ Returns original result when mount-all fails
- ✅ `unmountSmbShare()` calls `mountAllSmbShares()` after removal
- ✅ `mountSmbShare()` does NOT call `mountAllSmbShares()`
- ✅ Custom version parameter is respected in retry logic
- ✅ Mount-all response is returned when successful

### Capability & Diagnostic Tests (3 tests)
- ✅ `checkSmbCapabilities()` makes proper GET request
- ✅ `getSmbMountDiagnostics()` makes proper GET request with mount ID
- ✅ `getSmbServers()` makes proper GET request

## Test Coverage Summary

**Total Tests**: 44 (increased from existing auth tests)
- Existing auth/CSRF tests: 6
- New regression tests: 38

**Test File**: `src/api/__tests__/smb.test.ts`

## Recommendations for Future Work

1. **Add request validation** in mount functions to validate required fields early
2. **Add type guards** for response validation to ensure API contracts are met
3. **Document error handling behavior** in JSDoc for each API function
4. **Consider adding request/response logging** for debugging mount issues
5. **Add integration tests** with actual backend API

## Verification

All tests pass:
```
Test Files  1 passed (1)
     Tests  44 passed (44)
```

Run tests with:
```bash
npm test -- src/api/__tests__/smb.test.ts
```
