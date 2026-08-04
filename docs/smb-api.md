# SMB/CIFS API Documentation

**File**: `src/api/smb.ts`  
**Date**: 2026-08-03  
**Status**: Stable with comprehensive test coverage (67 tests)

## Overview

The SMB/CIFS API provides a comprehensive interface for discovering, configuring, and managing SMB (Samba) file server mounts on HiFiBerry systems. It handles:

- Network discovery of SMB servers
- Server connectivity testing with optional credentials
- Share enumeration and listing
- Mount configuration management
- Automatic mounting via systemd service
- System capability checking
- Detailed diagnostics for troubleshooting

## Quick Start

### Basic Server Discovery

```typescript
import { getSmbServers, getSmbShares, mountSmbShareWithRetry } from '@/api/smb'

// Discover available servers
const servers = await getSmbServers()
console.log(`Found ${servers.data.count} servers`)

// List shares on a server
const shares = await getSmbShares('192.168.1.27')
console.log(`Found ${shares.data.count} shares`)

// Mount a share with automatic retry and systemd integration
const result = await mountSmbShareWithRetry({
  server: '192.168.1.27',
  share: 'music',
  user: 'username',
  password: 'password'
})
```

### Advanced Configuration

```typescript
// Mount with custom options
const result = await mountSmbShareWithRetry({
  server: '192.168.1.27',
  share: 'music',
  mountpoint: '/mnt/music',        // Custom mount point
  user: 'username',
  password: 'password',
  version: '2.1',                  // Use SMB 2.1
  uid: 1001,                       // Unix user ID
  gid: 1001,                       // Unix group ID
  file_mode: '0755',               // File permissions
  dir_mode: '0755'                 // Directory permissions
})
```

## API Functions

### Discovery & Testing

#### `getSmbServers(): Promise<SmbServersResponse>`

Discovers SMB/CIFS servers on the local network.

**Returns**: Response with array of discovered servers and count

**Error Handling**: Throws on HTTP failure

**Example**:
```typescript
const result = await getSmbServers()
if (result.status === 'success') {
  result.data.servers.forEach(server => {
    console.log(`${server.name} (${server.ip})`)
  })
}
```

**Response Type**:
```typescript
interface SmbServersResponse {
  status: 'success' | 'error'
  data: {
    servers: SmbServer[]      // Array of discovered servers
    count: number             // Number of servers found
  }
  message?: string
}
```

#### `testSmbServer(server: string, username?: string, password?: string): Promise<SmbTestResponse>`

Tests connection to a specific SMB server with optional credential validation.

**Parameters**:
- `server`: Server IP address or hostname
- `username`: Optional SMB username (use DOMAIN\username format for domain accounts)
- `password`: Optional password for validation

**Returns**: Response indicating connection status

**Special Behavior**: May return HTTP 200 with `status: 'error'` for graceful handling of connection failures. This is intentional to allow UI to display connection errors without throwing.

**Example**:
```typescript
const result = await testSmbServer('192.168.1.27', 'user@domain', 'password')
if (result.status === 'success') {
  console.log('Server is reachable and credentials are valid')
} else {
  console.log('Connection test failed:', result.data.message)
  // UI can display error without exception handling
}
```

### Share Management

#### `getSmbShares(server: string, username?: string, password?: string, detailed?: boolean): Promise<SmbSharesResponse>`

Lists available shares on a specific SMB server.

**Parameters**:
- `server`: Target server IP or hostname
- `username`: Required for authenticated servers
- `password`: Required for authenticated servers
- `detailed`: Request detailed information (backend-dependent)

**Returns**: Response with shares list and count

**Error Handling**: Throws on HTTP failure or authentication failure

**Example**:
```typescript
try {
  const shares = await getSmbShares('192.168.1.27', 'user', 'pass')
  shares.data.shares.forEach(share => {
    console.log(`${share.name}: ${share.type}`)
    if (share.comment) console.log(`  Comment: ${share.comment}`)
  })
} catch (error) {
  console.error('Failed to list shares:', error.message)
}
```

### Mount Management

#### `mountSmbShare(request: SmbMountRequest): Promise<SmbMountResponse>`

Adds an SMB share configuration WITHOUT mounting it.

**Parameters**: `SmbMountRequest` object with server, share, and optional auth/mount details

**Returns**: Response confirming configuration was added

**Important**: This only stores the configuration. Call `mountAllSmbShares()` to actually mount.

**Use Case**: Use this for programmatic configuration without immediate mounting.

**Example**:
```typescript
const result = await mountSmbShare({
  server: '192.168.1.27',
  share: 'music',
  user: 'admin',
  password: 'secret'
})
if (result.status === 'success') {
  // Configuration stored, now mount it
  await mountAllSmbShares()
}
```

#### `mountSmbShareWithRetry(request: SmbMountRequest): Promise<SmbMountResponse>`

High-level mount operation with automatic retry and immediate mounting.

**Features**:
- Adds configuration with safe mount options
- Automatically calls `mountAllSmbShares()` to mount
- Retries with minimal options if first attempt fails
- Handles capability issues gracefully

**Parameters**: `SmbMountRequest` object (same as mountSmbShare)

**Returns**: Response with service status (mount-all response)

**Recommended**: Use this for user-facing mount operations

**Example**:
```typescript
try {
  const result = await mountSmbShareWithRetry({
    server: '192.168.1.27',
    share: 'music',
    user: 'username',
    password: 'password',
    version: '3.0'  // Specify SMB version
  })
  
  if (result.status === 'success') {
    console.log('Share mounted successfully')
  } else {
    console.error('Mount failed:', result.message)
  }
} catch (error) {
  console.error('Mount operation error:', error)
}
```

**Retry Strategy**: If initial mount with full safe options fails, retries with minimal options:
```
rw,uid=1000,gid=1000,file_mode=0644,dir_mode=0755
```

#### `unmountSmbShare(server: string, share: string): Promise<SmbMountResponse>`

Removes a share configuration and immediately unmounts it via systemd.

**Parameters**:
- `server`: Server IP or hostname
- `share`: Share name to remove

**Returns**: Response with updated service status

**Behavior**: 
1. Removes configuration entry
2. Calls `mountAllSmbShares()` to unmount and update system
3. Updates systemd service

**Example**:
```typescript
const result = await unmountSmbShare('192.168.1.27', 'music')
if (result.status === 'success') {
  console.log('Share removed and system updated')
}
```

#### `mountAllSmbShares(): Promise<SmbMountResponse>`

Triggers the SMB systemd service to mount all configured shares.

**Returns**: Response with service status

**Used By**: `mountSmbShareWithRetry()` and `unmountSmbShare()` automatically

**Manual Use**: Call directly if you've modified configurations and need to apply changes

**Example**:
```typescript
// After modifying multiple mount configurations
const result = await mountAllSmbShares()
console.log('Service status:', result.data.mpd_reconcile?.status)
```

#### `getSmbMounts(): Promise<SmbMountsResponse>`

Lists all configured SMB mounts and their current status.

**Returns**: Response with mounts array and summary statistics

**Example**:
```typescript
const result = await getSmbMounts()
console.log(`Total: ${result.data.summary.total}`)
console.log(`Mounted: ${result.data.summary.mounted}`)
console.log(`Unmounted: ${result.data.summary.unmounted}`)

result.data.mounts.forEach(mount => {
  const status = mount.mounted ? '✓ Mounted' : '✗ Not mounted'
  console.log(`${status}: ${mount.server}:${mount.share} -> ${mount.mountpoint}`)
})
```

### System Status

#### `checkSmbCapabilities(): Promise<SmbCapabilitiesResponse>`

Verifies system prerequisites for SMB mounting.

**Returns**: Response with capability status

**Checks**:
- CIFS utilities installation
- mount.cifs availability
- Current user capabilities (uid/gid)
- Supported SMB protocol versions
- System recommendations

**Use Before**: Attempting mount operations to validate system readiness

**Example**:
```typescript
const caps = await checkSmbCapabilities()

if (!caps.data.cifs_utils_installed) {
  console.error('CIFS utilities not installed')
  // Prompt user to install or contact admin
}

console.log('Supported versions:', caps.data.supported_versions)
console.log('Current UID:', caps.data.current_user.uid)
console.log('Recommendations:', caps.data.recommendations)
```

#### `getSmbMountDiagnostics(id: number): Promise<SmbDiagnosticsResponse>`

Gets detailed diagnostics for a specific mount configuration.

**Parameters**: Mount configuration ID

**Returns**: Response with detailed diagnostic information

**Includes**:
- Mount command that was attempted
- Mount command output
- Mount errors (if any)
- System capabilities at time of mount
- User ID and group ID information

**Use For**: Troubleshooting mount failures

**Example**:
```typescript
try {
  const diags = await getSmbMountDiagnostics(1)
  console.log('Mount path:', diags.data.mountpoint)
  console.log('CIFS available:', diags.data.system_info.cifs_available)
  console.log('Mount command:', diags.data.mount_command)
  
  if (diags.data.mount_error) {
    console.error('Mount error:', diags.data.mount_error)
  }
} catch (error) {
  console.error('Diagnostics failed:', error)
}
```

## Type Definitions

### `SmbMountRequest`

Configuration for mounting an SMB share:

```typescript
interface SmbMountRequest {
  action?: 'add' | 'remove'      // Auto-set by API functions
  server: string                 // Target server IP or hostname (required)
  share: string                  // Share name (required)
  mountpoint?: string            // Custom mount point (API provides default)
  user?: string                  // Username (required for auth servers)
  password?: string              // Password (required for auth servers)
  version?: string               // SMB version: '1.0', '2.0', '2.1', '3.0', '3.1.1'
  options?: string               // Custom CIFS mount options
  uid?: number                   // Unix user ID for mount
  gid?: number                   // Unix group ID for mount
  file_mode?: string             // File permissions (octal: '0644', '0755', etc.)
  dir_mode?: string              // Directory permissions (octal: '0755', etc.)
}
```

### `SmbServer`

Discovered SMB server:

```typescript
interface SmbServer {
  ip: string                     // Server IP address
  name: string                   // Server display name
  hostname: string               // Server hostname
  is_file_server: boolean        // Whether it's a file server
  services: string[]             // Available services (can be empty)
  local_network: string          // Network information
  interface: string              // Network interface used
}
```

### `SmbShare`

Share on an SMB server:

```typescript
interface SmbShare {
  name: string                   // Share name
  type: string                   // Share type (can be empty)
  comment?: string               // Optional share description
}
```

### `SmbMount`

Configured mount entry:

```typescript
interface SmbMount {
  id: number                     // Configuration ID
  server: string                 // Server IP/hostname
  share: string                  // Share name
  mountpoint: string             // Mount point path
  user: string                   // Username used
  version: string                // SMB version
  options: string                // Mount options
  mounted: boolean               // Current mount status
}
```

## Mount Options

### `createSafeMountOptions()`

Utility function to generate safe CIFS mount options:

```typescript
function createSafeMountOptions(
  username?: string,
  uid?: number,
  gid?: number,
  fileMode?: string,
  dirMode?: string,
  smbVersion?: string
): string
```

**Default Options Applied**:
- `rw` - Read-write access
- `file_mode=0644` - File permissions (default)
- `dir_mode=0755` - Directory permissions (default)
- `uid=1000` - Unix user ID (default)
- `gid=1000` - Unix group ID (default)
- `nobrl` - Disable byte range locking (compatibility)
- `cache=loose` - Loose caching mode (performance)
- `iocharset=utf8` - UTF-8 character set
- `vers=3.0` - SMB protocol version (default, can be 1.0, 2.0, 2.1, 3.0, 3.1.1)

**Example**:
```typescript
import { createSafeMountOptions } from '@/api/smb'

// Create options for user 'admin' with custom permissions
const opts = createSafeMountOptions('admin', 1000, 1000, '0755', '0755', '3.0')
// Result: "rw,file_mode=0755,dir_mode=0755,uid=1000,gid=1000,username=admin,nobrl,cache=loose,iocharset=utf8,vers=3.0"
```

## Error Handling

### HTTP Error Handling

The API throws errors on HTTP failures. Error messages include HTTP status and parsed details:

```typescript
try {
  await getSmbShares('invalid.server')
} catch (error) {
  // Error message format: "Operation failed: HTTP 404 - Server not found"
  console.error(error.message)
}
```

**Error Message Priority**:
1. `response.data.error_details` (most specific backend error)
2. `response.error` (generic error field)
3. `response.message` (main message field)
4. HTTP status code (fallback)

### Response Status vs HTTP Status

Some functions return different status than HTTP status:

```typescript
// testSmbServer may return HTTP 200 with status: 'error'
const result = await testSmbServer('unreachable.server')
if (result.status === 'error') {
  // Handle connection error without exception
  console.log('Connection failed:', result.message)
}
```

This is intentional for connection tests to allow graceful UI handling.

### Error Response Examples

```typescript
// HTTP 400 - Bad Request
{
  "status": "error",
  "message": "Bad request: Missing share name",
  "data": { "error_details": "..." }
}

// HTTP 403 - Access Denied
{
  "status": "error",
  "message": "Access denied: Invalid credentials",
  "error": "Permission denied"
}

// HTTP 500 - Server Error
{
  "status": "error",
  "message": "Server error: Mount service failed",
  "data": { "error_details": "..." }
}
```

## Authentication

### Required Credentials

- **Anonymous Servers**: No credentials needed, leave `user` and `password` empty
- **Authenticated Servers**: Both `user` and `password` required
- **Domain Accounts**: Use `DOMAIN\username` format for domain accounts

### Credential Storage

Credentials are:
- Sent to backend API via HTTPS POST body
- Stored on server for mount configuration
- Included in mount commands as needed
- **Never logged or exposed** in error messages

### CSRF Protection

All write operations (mount/unmount) require CSRF token:
- Automatically handled by `apiFetch()` wrapper
- Session cookie required (`credentials: 'same-origin'`)
- Token obtained from auth store on demand

## Security Considerations

1. **HTTPS Only**: All API calls use HTTPS
2. **CSRF Protection**: All write operations protected
3. **Authentication Prompt**: 401 responses trigger password prompt
4. **Credentials in Body**: Sent in POST body, not URL
5. **Mount Service**: Runs as root for privileged mount operations
6. **Error Messages**: Don't contain sensitive details beyond server/share names

## Testing

### Test Coverage

- 67 comprehensive tests covering all functions
- Auth handling and CSRF protection
- Error handling (HTTP 400, 403, 404, 500)
- Mount options generation
- Retry logic verification
- Request body construction
- Parameter handling
- Edge cases and empty responses

### Running Tests

```bash
# Run SMB tests
pnpm test src/api/__tests__/smb.test.ts

# Run with coverage
pnpm test --coverage src/api/__tests__/smb.test.ts

# Watch mode
pnpm test --watch src/api/__tests__/smb.test.ts
```

### Test Suites

1. **Auth Handling** - CSRF token, password prompts, auth retries
2. **Error Handling** - HTTP errors, error parsing, status codes
3. **Mount Options** - Option generation, versions, defaults
4. **Retry Logic** - Failure handling, minimal options, mount-all integration
5. **Capability & Diagnostics** - Status checks, detailed diagnostics
6. **Request Construction** - Body building, parameter handling
7. **Response Validation** - Empty lists, full responses, summaries

## Troubleshooting

### Mount Failures

1. **Check Capabilities**:
   ```typescript
   const caps = await checkSmbCapabilities()
   if (!caps.data.cifs_utils_installed) {
     // Install CIFS utilities
   }
   ```

2. **Verify Connection**:
   ```typescript
   const test = await testSmbServer('server.ip', 'user', 'pass')
   if (test.status === 'error') {
     console.error(test.data.message)
   }
   ```

3. **List Shares**:
   ```typescript
   const shares = await getSmbShares('server.ip', 'user', 'pass')
   // Verify share exists and is accessible
   ```

4. **Get Diagnostics**:
   ```typescript
   const diags = await getSmbMountDiagnostics(mountId)
   console.log('Mount command:', diags.data.mount_command)
   console.log('Mount error:', diags.data.mount_error)
   ```

### Permission Issues

- Ensure `uid` and `gid` match target system user
- Check file/directory modes are accessible
- Verify mount point permissions
- Check mount service service has appropriate privileges

### Connection Issues

- Verify server IP and hostname are correct
- Check credentials (DOMAIN\username format for domain accounts)
- Ensure SMB version compatibility (try SMB 2.1 or 3.0)
- Check firewall/network settings
- Verify authentication requirements

### SMB Version Compatibility

- **SMB 1.0**: Legacy, often disabled
- **SMB 2.0, 2.1**: Good compatibility, recommended for older servers
- **SMB 3.0, 3.1.1**: Modern, best for performance and security (default)

## Integration Examples

### Vue Component Integration

```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { getSmbServers, getSmbShares, mountSmbShareWithRetry } from '@/api/smb'
import type { SmbServer, SmbShare } from '@/api/smb'

const servers = ref<SmbServer[]>([])
const shares = ref<SmbShare[]>([])
const selectedServer = ref<SmbServer | null>(null)
const selectedShare = ref<SmbShare | null>(null)
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function loadServers() {
  loading.value = true
  try {
    const result = await getSmbServers()
    servers.value = result.data.servers
  } catch (e) {
    error.value = `Failed to discover servers: ${e.message}`
  } finally {
    loading.value = false
  }
}

async function loadShares() {
  if (!selectedServer.value) return
  loading.value = true
  try {
    const result = await getSmbShares(
      selectedServer.value.ip,
      username.value,
      password.value
    )
    shares.value = result.data.shares
  } catch (e) {
    error.value = `Failed to list shares: ${e.message}`
  } finally {
    loading.value = false
  }
}

async function mountShare() {
  if (!selectedServer.value || !selectedShare.value) return
  loading.value = true
  try {
    const result = await mountSmbShareWithRetry({
      server: selectedServer.value.ip,
      share: selectedShare.value.name,
      user: username.value,
      password: password.value
    })
    if (result.status === 'success') {
      error.value = ''
      // Refresh mounts list or navigate
    } else {
      error.value = `Mount failed: ${result.message}`
    }
  } catch (e) {
    error.value = `Mount error: ${e.message}`
  } finally {
    loading.value = false
  }
}
</script>
```

## Related Documentation

- [SMB Mount Dialog Review](smb-mount-dialog-review.md) - UI Component details
- [SMB API Review](smb-api-review.md) - Previous review notes
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture overview
- Backend API: HiFiBerry system SMB configuration endpoints

## Version History

- **2026-08-03**: Initial comprehensive documentation
  - Added 23 new unit/regression tests (44 → 67 tests)
  - Enhanced JSDoc documentation for all functions
  - Documented error handling patterns
  - Added integration examples
  - Added mount options reference
  - Added troubleshooting guide

- **2026-08-02**: Previous API review and fixes
  - Fixed SMB version parameter handling
  - Added comprehensive error handling tests
  - Documented retry logic behavior
