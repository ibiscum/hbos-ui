# AppConfig Store Documentation

## Overview

`appconfig.ts` is a Pinia store that manages centralized application configuration for the HBOS (HiFiBerry OS) UI. It handles configuration for multiple backend API endpoints and provides utilities to build proper API URLs based on environment settings.

## Purpose

The AppConfig store serves several key functions:

1. **API Endpoint Management**: Maintains configuration for four distinct API types:
   - `audiocontrol_api` - Audio control operations
   - `config_api` - Configuration management
   - `dsptoolkit_api` - DSP (Digital Signal Processing) toolkit
   - `roomeq_api` - Room EQ settings

2. **Environment-Aware URL Building**: Dynamically constructs API URLs based on deployment context (development with proxy, production with direct connection)

3. **Configuration Validation**: Validates API configurations before updates to prevent invalid states

4. **Radio Player State**: Maintains the current radio player selection

## AppConfig Interface

```typescript
interface AppConfig {
  radioPlayer: string
  audiocontrol_api: ApiEndpointConfig
  config_api: ApiEndpointConfig
  dsptoolkit_api: ApiEndpointConfig
  roomeq_api: ApiEndpointConfig
}
```

Each API endpoint requires:
- `deviceIP` - Target device hostname/IP
- `devicePort` - Target device port (1-65535)
- `apiPrefix` - API path prefix (e.g., `/api/audiocontrol`)
- `useProxy` - Whether to route through proxy (development) or direct connection (production)

## Initialization

Configuration is initialized from environment variables with sensible defaults:

```typescript
// Environment variables (with fallbacks)
VITE_APP_DEVICE_IP          // Default: current window hostname
VITE_APP_DEVICE_PORT        // Default: 80
VITE_APP_API_PREFIX         // Default: /api/audiocontrol
VITE_APP_CONFIG_API_PREFIX  // Default: /api/config/v1
VITE_APP_DSPTOOLKIT_API_PREFIX // Default: /api/dsptoolkit
VITE_APP_ROOMEQ_API_PREFIX  // Default: /api/roomeq
```

**Proxy Mode**: Automatically enabled in development (`!import.meta.env.PROD`) to handle CORS restrictions. Disabled in production for direct device communication.

## Core Utilities

### `validateApiConfig(config: unknown): boolean`

Validates that a configuration object meets requirements:
- Must be an object with valid properties
- `deviceIP` must be non-empty string
- `devicePort` must be number between 1-65535
- `apiPrefix` must be string
- `useProxy` must be boolean

### `buildApiUrl(protocol, deviceIP, devicePort, apiPrefix, useProxy): string`

Constructs API URLs with intelligent handling:

**Proxy Mode** (`useProxy=true`):
- Uses current window's origin (e.g., `http://localhost:5173`)
- Appends `apiPrefix` (e.g., `http://localhost:5173/api/audiocontrol`)
- Useful for development to bypass CORS restrictions

**Direct Mode** (`useProxy=false`):
- Connects directly to device IP/port
- Omits default ports (80 for HTTP/WebSocket)
- Result: `http://192.168.1.100:8080/api/audiocontrol`

## Store State

```typescript
config    // ref<AppConfig> - Current configuration
loading   // ref<boolean> - Action in progress
error     // ref<string|null> - Last error message
```

## Store Actions

### `getConfig(): Promise<AppConfig>`

Retrieves current configuration. Currently returns cached config (designed for future API integration).

**Returns**: AppConfig object

**Side Effects**: Sets `loading` during operation, clears `error` on success

### `updateConfig(newConfig: Partial<AppConfig>): Promise<boolean>`

Updates configuration with validation.

**Validation**:
- Validates all provided API configs using `validateApiConfig()`
- Throws descriptive error if validation fails

**Parameters**: Partial AppConfig (only updated fields needed)

**Returns**: `true` on success, `false` on error

**Side Effects**: Updates `config.value`, sets `error` on failure

### `setRadioPlayer(playerName: string): Promise<boolean>`

Convenience method to update radio player.

**Validation**: Ensures playerName is non-empty string

**Parameters**: Player name (e.g., 'mpd', 'spotify')

**Returns**: Success boolean

### `setApiConfig(apiType, apiConfig): Promise<boolean>`

Updates a specific API endpoint configuration.

**Parameters**:
- `apiType` - One of: 'audiocontrol' | 'config' | 'dsptoolkit' | 'roomeq'
- `apiConfig` - Partial endpoint configuration (only fields to update)

**Returns**: Success boolean

**Example**:
```typescript
// Update audiocontrol API port
await appConfigStore.setApiConfig('audiocontrol', { devicePort: 8080 })
```

## Store Getters

### Computed Getters
- `radioPlayer` - Current radio player name
- `apiConfig` - Current audiocontrol_api configuration
- `configApiConfig` - Current config_api configuration

### URL Builder Methods

All return properly formatted API URLs based on current configuration:

- `getApiBaseUrl()` - HTTP URL for audiocontrol API
- `getWsBaseUrl(forceProxy?)` - WebSocket URL for audiocontrol API
  - By default uses direct connection (no CORS for WS)
  - Can force proxy with `forceProxy=true`
- `getConfigApiBaseUrl()` - HTTP URL for config API
- `getDSPToolkitApiBaseUrl()` - HTTP URL for DSP toolkit API
- `getRoomEQApiBaseUrl()` - HTTP URL for RoomEQ API

## Usage Flow

### 1. Application Startup

```typescript
import { useAppConfigStore } from '@/stores/appconfig'

const appConfigStore = useAppConfigStore()
// Config automatically initialized from env vars
```

### 2. Using API URLs

```typescript
// Get HTTP endpoint for audiocontrol API
const baseUrl = appConfigStore.getApiBaseUrl()
// Result (dev): http://localhost:5173/api/audiocontrol
// Result (prod): http://192.168.1.100/api/audiocontrol

// Get WebSocket endpoint
const wsUrl = appConfigStore.getWsBaseUrl()
// Result: ws://192.168.1.100/api/audiocontrol (direct)
```

### 3. Configuring Different Endpoints

```typescript
// Update device IP for all APIs
const success = await appConfigStore.updateConfig({
  audiocontrol_api: { ...appConfigStore.config.audiocontrol_api, deviceIP: '192.168.1.50' },
  config_api: { ...appConfigStore.config.config_api, deviceIP: '192.168.1.50' },
  // ... etc
})

// Or update specific API
await appConfigStore.setApiConfig('audiocontrol', { devicePort: 9000 })
```

### 4. Handling Errors

```typescript
const { loading, error } = storeToRefs(appConfigStore)

// In template
<div v-if="error" class="error">{{ error }}</div>
<div v-if="loading">Updating configuration...</div>
```

## Key Design Decisions

1. **Multiple API Configurations**: Different microservices may run on different ports/protocols; store allows independent configuration

2. **DRY URL Building**: `buildApiUrl()` centralizes URL construction logic to prevent duplication and inconsistencies

3. **Proxy/Direct Routing**: Automatically handles development CORS issues while supporting direct device connection in production

4. **Validation Before Update**: Prevents invalid states from propagating through the application

5. **Backward Compatibility**: `setApiConfig()` supports both direct config and typed API selection signatures

## Environment Variables Reference

| Variable | Default | Example |
|----------|---------|---------|
| VITE_APP_DEVICE_IP | window.location.hostname | 192.168.1.100 |
| VITE_APP_DEVICE_PORT | 80 | 8080 |
| VITE_APP_API_PREFIX | /api/audiocontrol | /api/v2/audiocontrol |
| VITE_APP_CONFIG_API_PREFIX | /api/config/v1 | /api/config/v2 |
| VITE_APP_DSPTOOLKIT_API_PREFIX | /api/dsptoolkit | /api/v1/dsptoolkit |
| VITE_APP_ROOMEQ_API_PREFIX | /api/roomeq | /api/roomeq/v1 |

All environment variables should be prefixed with `VITE_` to be available in the browser.
