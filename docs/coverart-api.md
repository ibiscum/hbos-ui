# Cover Art API

## Overview

The Cover Art API module provides functionality for managing custom cover art images for artists in the HiFiBerry Web UI. It allows updating artist images and retrieving available cover art methods and providers.

## Location

`src/api/coverart.ts`

## Interfaces

### CoverArtUpdateRequest

Request payload for updating an artist's custom image.

```typescript
interface CoverArtUpdateRequest {
  url: string  // URL of the custom image to set
}
```

### CoverArtUpdateResponse

Response from the update artist image endpoint.

```typescript
interface CoverArtUpdateResponse {
  success: boolean
  message: string
}
```

### CoverArtProvider

Represents a single cover art provider.

```typescript
interface CoverArtProvider {
  name: string           // Internal identifier (e.g., 'embedded_tags')
  display_name: string   // Human-readable name (e.g., 'Embedded Tags')
}
```

### CoverArtMethod

Represents a cover art method with its available providers.

```typescript
interface CoverArtMethod {
  method: string              // Method type (e.g., 'embedded', 'local')
  providers: CoverArtProvider[]  // List of providers for this method
}
```

### CoverArtMethodsResponse

Response from the get cover art methods endpoint.

```typescript
interface CoverArtMethodsResponse {
  methods: CoverArtMethod[]  // Array of available cover art methods
}
```

## Functions

### updateArtistImage

Updates the custom image URL for a specific artist.

**Signature:**
```typescript
export async function updateArtistImage(
  artistName: string,
  imageUrl: string
): Promise<CoverArtUpdateResponse>
```

**Parameters:**
- `artistName` - The artist name. Must be a non-empty, non-whitespace string.
- `imageUrl` - The URL of the custom image. Must be a non-empty, non-whitespace string.

**Returns:**
- Promise resolving to `CoverArtUpdateResponse` with success status and message

**Throws:**
- `Error` if artistName or imageUrl is empty/whitespace
- `Error` if the API request fails (includes HTTP status and error details)
- `Error` if response parsing fails

**Implementation Details:**
1. Validates input parameters (non-empty, non-whitespace)
2. Encodes artist name to URL-safe base64 (no `+`, `/`, or `=`)
3. Constructs API URL: `/coverart/artist/{base64_encoded_name}/update`
4. Sends POST request with JSON body containing image URL
5. Includes both `Content-Type` and `Accept` headers
6. Handles error responses gracefully with detailed error messages

**Example Usage:**
```typescript
try {
  const response = await updateArtistImage('The Beatles', 'https://example.com/beatles.jpg');
  if (response.success) {
    console.log('Artist image updated:', response.message);
  }
} catch (error) {
  console.error('Failed to update artist image:', error);
}
```

**Base64 Encoding Behavior:**
- UTF-8 safe: handles Unicode characters (e.g., "Björk")
- URL-safe: replaces `+` with `-`, `/` with `_`, and removes `=` padding
- Deterministic: same artist name always encodes to same base64

### getCoverArtMethods

Retrieves available cover art methods and their providers.

**Signature:**
```typescript
export async function getCoverArtMethods(): Promise<CoverArtMethodsResponse>
```

**Parameters:**
- None

**Returns:**
- Promise resolving to `CoverArtMethodsResponse` containing available methods and providers

**Throws:**
- `Error` if the API request fails (includes HTTP status and error details)
- `Error` if response parsing fails

**Implementation Details:**
1. Constructs API URL: `/coverart/methods`
2. Sends GET request with `Accept: application/json` header
3. Handles error responses gracefully with detailed error messages

**Example Usage:**
```typescript
try {
  const result = await getCoverArtMethods();
  console.log('Available methods:', result.methods);
  result.methods.forEach(method => {
    console.log(`${method.method}:`, method.providers.map(p => p.display_name));
  });
} catch (error) {
  console.error('Failed to fetch cover art methods:', error);
}
```

## Error Handling

Both functions implement consistent error handling:

1. **Input Validation Errors**: For `updateArtistImage`, empty or whitespace-only parameters throw descriptive errors before making API calls.

2. **HTTP Errors**: When responses are not OK (status >= 400):
   - Attempts to read error body as text
   - Falls back to generic message if body reading fails
   - Includes HTTP status code in error message
   - Logs full error details to console.error

3. **Parse Errors**: If response body cannot be parsed as JSON:
   - Error propagates with original message
   - Logged to console.error

## API Endpoints

### POST `/coverart/artist/{artistB64}/update`

Updates a custom image for an artist.

**Request:**
```json
{
  "url": "https://example.com/image.jpg"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Image updated successfully"
}
```

**Error Response (4xx/5xx):**
```
HTTP {status} {statusText}
{error details in response body}
```

### GET `/coverart/methods`

Retrieves available cover art methods and providers.

**Success Response (200):**
```json
{
  "methods": [
    {
      "method": "embedded",
      "providers": [
        {
          "name": "embedded_tags",
          "display_name": "Embedded Tags"
        }
      ]
    },
    {
      "method": "local",
      "providers": [
        {
          "name": "folder_images",
          "display_name": "Folder Images"
        }
      ]
    }
  ]
}
```

## Test Coverage

Comprehensive test suite located at `src/__tests__/api/coverart.test.ts`

### Test Categories

#### Unit Tests - updateArtistImage
- ✓ Successfully update artist image with valid inputs
- ✓ Encode artist name to URL-safe base64
- ✓ Handle special characters (AC/DC, &, etc.)
- ✓ Handle Unicode characters (Björk, etc.)
- ✓ Send correct POST request headers
- ✓ Send correct request body
- ✓ Throw on HTTP error responses (404, 500)
- ✓ Throw on network errors
- ✓ Throw on invalid JSON response
- ✓ Construct correct API URL
- ✓ Validate artist name is not empty
- ✓ Validate artist name is not whitespace-only
- ✓ Validate image URL is not empty
- ✓ Validate image URL is not whitespace-only

#### Unit Tests - getCoverArtMethods
- ✓ Successfully fetch cover art methods
- ✓ Send GET request with correct headers
- ✓ Construct correct API URL
- ✓ Throw on HTTP error responses (401, 500)
- ✓ Throw on network errors
- ✓ Throw on invalid JSON response
- ✓ Handle empty methods array

#### Regression Tests
- ✓ Maintain backward compatibility for updateArtistImage response format
- ✓ Maintain backward compatibility for getCoverArtMethods response format
- ✓ Persist base64 encoding logic across updates

### Test Statistics
- **Total Tests**: 27
- **Coverage**: All happy paths, error conditions, and edge cases
- **Mocking**: All external dependencies (apiFetch, useAppConfigStore) are mocked
- **Framework**: Vitest with Happy-DOM environment

## Implementation Improvements

### Recent Changes
1. **Input Validation**: Added checks for empty/whitespace artist names and URLs
2. **Error Details**: Enhanced error messages to include HTTP status and response body
3. **Error Recovery**: Improved handling of failed response body parsing
4. **Consistent Headers**: Added `Accept: application/json` header to POST requests for consistency with GET requests
5. **Documentation**: Comprehensive JSDoc comments with parameter validation details

### Design Patterns
- **URL-Safe Base64 Encoding**: Custom implementation for artist name encoding
- **Error Resilience**: Graceful handling of failed error body reads
- **Dependency Injection**: Uses injected config store and fetch API
- **Request/Response Types**: Strongly typed interfaces for all API contracts
- **Logging**: Debug logging for request/response inspection

## Dependencies

- **@/stores/appconfig**: Provides API base URL via `useAppConfigStore()`
- **@/api/http**: Provides `apiFetch` for HTTP requests with CSRF protection
- **Vue 3**: Reactive store integration

## Configuration

The API base URL is determined by the `appconfig` store via `getApiBaseUrl()`. Ensure the store is properly initialized before calling these functions.

## Notes

- All API calls include CSRF token protection through the `apiFetch` wrapper
- Artist names are encoded to URL-safe base64 to handle special characters and Unicode
- Error responses include detailed information for debugging
- All functions are async and should be awaited
- Console logging is included for development/debugging purposes
