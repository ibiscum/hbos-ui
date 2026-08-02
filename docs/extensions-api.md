# Extensions API

Comprehensive guide to the HiBerryOS Extensions API (`src/api/extensions.ts`).

## Overview

The Extensions API provides a unified interface for managing extensions in the HiBerryOS system. It handles:
- Listing and fetching extension information
- Installing and uninstalling extensions
- Refreshing extension catalogs
- Managing APT and GitHub extension sources
- Tracking asynchronous jobs for long-running operations

## Core Concepts

### Extension States

An extension can be in one of three states:

- **available**: The extension is available for installation but not currently installed
- **installed**: The extension is currently installed on the system
- **upgradable**: The extension is installed but a newer version is available

### Job Phases

Extension operations (install, uninstall, refresh) run asynchronously as jobs. A job progresses through these phases:

- **queued**: The job is queued and waiting to start
- **downloading**: The job is downloading packages or data
- **installing**: The job is installing or configuring packages
- **configuring**: The job is running post-installation configuration
- **done**: The job completed successfully
- **failed**: The job failed with an error

**Terminal Phases** are `done` and `failed` - they indicate the job has completed and no further state transitions will occur.

### Reboot Requirements

After certain operations (usually kernel module installations), the system may need to reboot:

- **no**: No reboot is required
- **maybe**: A reboot might be required depending on system state (e.g., modules are in use)
- **yes**: A reboot is definitely required

### Extension Sources

The system supports two types of extension sources:

#### APT Sources

Traditional Debian package repositories. Configured with:
- **uri**: The repository URL (e.g., `deb http://repo.example.com/deb`)
- **suite**: The distribution suite (e.g., `focal`, `jammy`)
- **components**: Repository components (e.g., `main`, `contrib`)
- **keyring**: Path to GPG keyring for signature verification

#### GitHub Sources

Directly source extensions from GitHub repositories in `owner/repo` format. Useful for:
- Development/testing extensions
- Custom-built extensions
- Pre-release extensions

## API Functions

### Extension Listing & Details

#### `listExtensions(): Promise<ExtensionsApiResponse<{ extensions: Extension[] }>>`

Fetch all available extensions from all configured sources.

**Response:**
```typescript
{
  status: 'success' | 'error',
  count?: number,
  data: { extensions: Extension[] }
}
```

**Example:**
```typescript
const response = await listExtensions()
response.data.extensions.forEach(ext => {
  console.log(`${ext.name} (${ext.version})`)
})
```

#### `getExtension(pkg: string): Promise<ExtensionsApiResponse<Extension>>`

Fetch detailed information about a specific extension by package name.

**Parameters:**
- `pkg`: Package name (will be URL-encoded automatically)

**Response:**
```typescript
{
  status: 'success' | 'error',
  data: Extension
}
```

**Example:**
```typescript
const response = await getExtension('audio-player')
console.log(`Current version: ${response.data.version}`)
console.log(`Installed version: ${response.data.installed_version}`)
console.log(`State: ${response.data.state}`)
```

### Extension Operations

Extension operations (install/uninstall/refresh) return immediately with a job ID. Use `getExtensionJob()` to poll for progress.

#### `installExtension(pkg: string): Promise<ExtensionsApiResponse<{ job: ExtensionJob }>>`

Queue installation of an extension.

**Parameters:**
- `pkg`: Package name to install

**Response:**
```typescript
{
  status: 'success' | 'error',
  data: { job: ExtensionJob }
}
```

**Example:**
```typescript
const response = await installExtension('dsp-toolkit')
const jobId = response.data.job.id
// Poll getExtensionJob(jobId) for progress
```

#### `uninstallExtension(pkg: string): Promise<ExtensionsApiResponse<{ job: ExtensionJob }>>`

Queue uninstallation of an extension.

**Parameters:**
- `pkg`: Package name to uninstall

**Response:**
```typescript
{
  status: 'success' | 'error',
  data: { job: ExtensionJob }
}
```

#### `refreshExtensions(): Promise<ExtensionsApiResponse<{ job: ExtensionJob }>>`

Queue a refresh of the extension catalog from all configured sources.

**Response:**
```typescript
{
  status: 'success' | 'error',
  data: { job: ExtensionJob }
}
```

**Example:**
```typescript
const response = await refreshExtensions()
const jobId = response.data.job.id
// Poll for completion: when job.phase is in TERMINAL_PHASES
```

### Job Tracking

#### `getExtensionJob(jobId: string): Promise<ExtensionsApiResponse<{ job: ExtensionJob, reboot_required: boolean }>>`

Fetch current status of an extension job.

**Parameters:**
- `jobId`: The job ID returned from install/uninstall/refresh operations

**Response:**
```typescript
{
  status: 'success' | 'error',
  data: {
    job: ExtensionJob,
    reboot_required: boolean
  }
}
```

**Example:**
```typescript
const response = await getExtensionJob(jobId)
const { job, reboot_required } = response.data

console.log(`Progress: ${job.percent}%`)
console.log(`Phase: ${job.phase}`)
console.log(`Logs:`)
job.log.forEach(line => console.log(`  ${line}`))

if (TERMINAL_PHASES.includes(job.phase)) {
  if (job.exit_code === 0) {
    console.log('Job completed successfully')
    if (reboot_required) {
      console.log('System reboot required!')
    }
  } else {
    console.error(`Job failed: ${job.error}`)
  }
}
```

### APT Source Management

#### `listExtensionSources(): Promise<ExtensionsApiResponse<{ sources: ExtensionSource[] }>>`

List all configured APT extension sources.

**Response:**
```typescript
{
  status: 'success' | 'error',
  count?: number,
  data: { sources: ExtensionSource[] }
}
```

#### `addExtensionSource(input: ExtensionSourceInput): Promise<ExtensionsApiResponse<{ source: ExtensionSource }>>`

Add a new APT extension source.

**Parameters:**
```typescript
{
  id: string           // Unique identifier for the source
  uri: string          // Repository URL (e.g., "deb http://...")
  suite: string        // Distribution suite (e.g., "focal")
  components: string   // Components (e.g., "main contrib")
  key: string          // GPG key URL
}
```

**Response:**
```typescript
{
  status: 'success' | 'error',
  data: { source: ExtensionSource }
}
```

**Example:**
```typescript
const response = await addExtensionSource({
  id: 'custom-repo',
  uri: 'deb http://repo.example.com/deb',
  suite: 'jammy',
  components: 'main',
  key: 'https://repo.example.com/key.gpg'
})

if (response.status === 'success') {
  console.log(`Source added at: ${response.data.source.keyring}`)
}
```

#### `removeExtensionSource(id: string): Promise<ExtensionsApiAck>`

Remove an APT extension source by ID.

**Parameters:**
- `id`: The source ID to remove

**Response:**
```typescript
{
  status: 'success' | 'error',
  message?: string
}
```

### GitHub Source Management

#### `listGithubSources(): Promise<ExtensionsApiResponse<{ sources: GithubSource[] }>>`

List all configured GitHub extension sources.

**Response:**
```typescript
{
  status: 'success' | 'error',
  count?: number,
  data: { sources: GithubSource[] }
}
```

#### `addGithubSource(repo: string): Promise<ExtensionsApiResponse<{ source: GithubSource }>>`

Add a new GitHub extension source in `owner/repo` format.

**Parameters:**
- `repo`: GitHub repository in format `owner/repo`

**Response:**
```typescript
{
  status: 'success' | 'error',
  data: { source: GithubSource }
}
```

**Example:**
```typescript
const response = await addGithubSource('hifiberry/dsp-extensions')

if (response.status === 'success') {
  console.log(`Added GitHub source: ${response.data.source.repo}`)
}
```

#### `removeGithubSource(id: string): Promise<ExtensionsApiAck>`

Remove a GitHub extension source by ID.

**Parameters:**
- `id`: The source ID to remove

**Response:**
```typescript
{
  status: 'success' | 'error',
  message?: string
}
```

## Error Handling

All API functions throw an error if the request fails. The error message is constructed from:

1. **Server message** (preferred): If the server returns a JSON response with a `message` field, that message is used
2. **HTTP status code** (fallback): If no message is available, the HTTP status code is used

**Example:**
```typescript
try {
  await installExtension('nonexistent-package')
} catch (error) {
  // error.message could be:
  // - "Extensions API request failed: Package not found" (from server)
  // - "Extensions API request failed: 404" (fallback)
  console.error(error.message)
}
```

## Type Definitions

### Extension

```typescript
interface Extension {
  package: string           // Debian package name
  name: string              // Human-readable name
  category: 'player' | 'dsp' | 'tool'
  summary: string           // Short description
  description: string       // Long description
  version: string | null    // Available version (null if not available)
  installed_version: string | null
  state: 'available' | 'installed' | 'upgradable'
  needs_reboot: 'no' | 'maybe' | 'yes'
  icon_url: string | null   // URL to icon image
  source: string            // "apt" or "github:owner/repo"
}
```

### ExtensionJob

```typescript
interface ExtensionJob {
  id: string                // Unique job identifier
  package: string | null    // Package being operated on (null for refresh)
  action: 'install' | 'uninstall' | 'refresh'
  phase: JobPhase           // Current phase
  percent: number           // Progress 0-100
  exit_code: number | null  // Exit code (only when phase is done/failed)
  error: string | null      // Error message (only when phase is failed)
  started_at: number        // Unix timestamp in seconds
  finished_at: number | null // Unix timestamp in seconds
  log: string[]             // Operation logs
}
```

### ExtensionSource (APT)

```typescript
interface ExtensionSource {
  id: string                // Unique identifier
  uri: string               // Repository URL
  suite: string             // Distribution suite
  components: string        // Repository components
  keyring: string           // Path to GPG keyring
}
```

### GithubSource

```typescript
interface GithubSource {
  id: string                // Unique identifier
  repo: string              // Repository in "owner/repo" format
}
```

### Response Types

```typescript
interface ExtensionsApiResponse<T> {
  status: 'success' | 'error'
  message?: string          // Error message if status is 'error'
  count?: number            // Number of items in list responses
  data: T                   // Response data
}

interface ExtensionsApiAck {
  status: 'success' | 'error'
  message?: string          // Optional message
}
```

## Implementation Details

### URL Encoding

All dynamic URL segments (package names, source IDs, job IDs) are automatically URL-encoded using `encodeURIComponent()`. This allows special characters in identifiers.

### Request Routing

All requests are routed through `apiFetch()`, which handles:
- Session cookie inclusion (`credentials: 'same-origin'`)
- CSRF token attachment for write operations (POST, DELETE, PATCH, PUT)
- Automatic CSRF token recovery on 401 responses
- Authentication prompts when needed

### Base URL

The API base URL is obtained from the app config store: `useAppConfigStore().getConfigApiBaseUrl()`

This allows the API to work in different deployment scenarios (same-origin, reverse proxy, etc.).

## Testing

The Extensions API includes comprehensive unit tests covering:
- All API functions
- Success and error scenarios
- Special character handling in identifiers
- Error message extraction from various response formats
- Network error handling
- Malformed response handling

Run tests with:
```bash
pnpm run test -- src/__tests__/api/extensions.test.ts
```

## Common Patterns

### Poll for Job Completion

```typescript
async function waitForJob(jobId: string, maxWaitMs = 300000): Promise<ExtensionJob> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitMs) {
    const response = await getExtensionJob(jobId)
    const job = response.data.job
    
    if (TERMINAL_PHASES.includes(job.phase)) {
      return job
    }
    
    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error(`Job ${jobId} did not complete within ${maxWaitMs}ms`)
}
```

### Install and Wait

```typescript
async function installAndWait(pkg: string): Promise<ExtensionJob> {
  const response = await installExtension(pkg)
  if (response.status !== 'success') {
    throw new Error(`Failed to queue installation: ${response.message}`)
  }
  
  const job = await waitForJob(response.data.job.id)
  
  if (job.exit_code !== 0) {
    throw new Error(`Installation failed: ${job.error}`)
  }
  
  return job
}
```

### Check All Extension Updates

```typescript
async function checkForUpdates(): Promise<Extension[]> {
  const response = await listExtensions()
  return response.data.extensions.filter(ext => ext.state === 'upgradable')
}
```

## Related APIs

- [HTTP API Wrapper](HTTP_API_WRAPPER.md) - Underlying request handling
- [Config API](config-api.md) - Application configuration
