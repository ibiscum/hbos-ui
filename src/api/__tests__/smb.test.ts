import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => 'http://host/api/config/v1' }),
}))

import {
  getSmbMounts,
  getSmbServers,
  getSmbShares,
  mountAllSmbShares,
  mountSmbShare,
  mountSmbShareWithRetry,
  testSmbServer,
  unmountSmbShare,
  createSafeMountOptions,
  checkSmbCapabilities,
  getSmbMountDiagnostics,
} from '@/api/smb'

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(headers),
  json: async () => body,
})

const success = { status: 'success', data: {}, message: '' }

/** Every risky SMB write: name → invocation. All of these hit endpoints the
 *  auth gateway classifies as risky, so each must go through apiFetch. */
const riskyCalls: Array<[string, () => Promise<unknown>]> = [
  ['testSmbServer', () => testSmbServer('192.168.1.27')],
  ['getSmbShares', () => getSmbShares('192.168.1.27')],
  ['mountSmbShare', () => mountSmbShare({ server: '192.168.1.27', share: 'music' })],
  ['mountAllSmbShares', () => mountAllSmbShares()],
  ['unmountSmbShare', () => unmountSmbShare('192.168.1.27', 'music')],
  [
    'mountSmbShareWithRetry',
    () => mountSmbShareWithRetry({ server: '192.168.1.27', share: 'music' }),
  ],
]

describe('smb api auth handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it.each(riskyCalls)('%s prompts for the password on a 401 and retries', async (_name, call) => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'set-password' }))
      .mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockImplementation(async (hint) => {
      expect(hint).toBe('set-password')
      authStore.csrf = 'tok-1'
      return true
    })

    await call()

    expect(promptSpy).toHaveBeenCalledTimes(1)
    // The retry carries the token minted by the prompt.
    expect(fetchMock.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('tok-1')
  })

  it.each(riskyCalls)('%s attaches the csrf token and session cookie', async (_name, call) => {
    const authStore = useAuthStore()
    authStore.csrf = 'tok-abc'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await call()

    const init = fetchMock.mock.calls[0][1]
    expect(init.credentials).toBe('same-origin')
    expect((init.headers as Headers).get('X-CSRF-Token')).toBe('tok-abc')
  })

  it.each(riskyCalls)('%s surfaces a cancelled prompt as an error', async (_name, call) => {
    const authStore = useAuthStore()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'set-password' })),
    )
    vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(false)

    await expect(call()).rejects.toThrow(/Authentication required/)
  })

  it('keeps the JSON content type on the request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await testSmbServer('192.168.1.27', 'user', 'secret')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://host/api/config/v1/smb/test/192.168.1.27')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({
      server: '192.168.1.27',
      username: 'user',
      password: 'secret',
    })
  })

  it('routes the ok-tier reads through apiFetch too (session cookie, no csrf)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await getSmbMounts()
    await getSmbServers()

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.credentials).toBe('same-origin')
      expect((init.headers as Headers).has('X-CSRF-Token')).toBe(false)
    }
  })
})

describe('smb api error handling regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('throws on HTTP 400 with proper error message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(400, { message: 'Missing parameters' })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getSmbShares('192.168.1.27')).rejects.toThrow(/Bad request.*Missing parameters/)
  })

  it('throws on HTTP 403 access denied', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(403, { message: 'Permission denied' })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getSmbShares('192.168.1.27')).rejects.toThrow(/Access denied.*Permission denied/)
  })

  it('throws on HTTP 404 not found', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(404, { message: 'Server not found' })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(testSmbServer('192.168.1.27')).rejects.toThrow(/Not found.*Server not found/)
  })

  it('throws on HTTP 500 server error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(500, { message: 'Internal server error' })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getSmbMounts()).rejects.toThrow(/Server error.*Internal server error/)
  })

  it('handles error response with error_details field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(400, { data: { error_details: 'Invalid share name format' } })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getSmbShares('192.168.1.27')).rejects.toThrow(
      /Bad request.*Invalid share name format/
    )
  })

  it('handles error response with error field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(500, { error: 'Mount process crashed' })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(mountAllSmbShares()).rejects.toThrow(/Server error.*Mount process crashed/)
  })

  it('uses default error message when no error details available', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, {}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getSmbMounts()).rejects.toThrow(/Server error/)
  })

  it('returns error response without throwing when status is error but HTTP is 200', async () => {
    const errorResponse = { status: 'error', data: {}, message: 'Connection timeout' }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, errorResponse))
    vi.stubGlobal('fetch', fetchMock)

    const result = await testSmbServer('192.168.1.27')
    expect(result.status).toBe('error')
    expect(result.message).toBe('Connection timeout')
  })
})

describe('smb api mount options regression tests', () => {
  it('createSafeMountOptions includes default version 3.0', () => {
    const options = createSafeMountOptions()
    expect(options).toContain('vers=3.0')
  })

  it('createSafeMountOptions respects custom SMB version', () => {
    const options = createSafeMountOptions(undefined, undefined, undefined, undefined, undefined, '2.1')
    expect(options).toContain('vers=2.1')
    expect(options).not.toContain('vers=3.0')
  })

  it('createSafeMountOptions includes all required fields', () => {
    const options = createSafeMountOptions('user1', 1000, 1000, '0755', '0755', '3.0')
    expect(options).toContain('rw')
    expect(options).toContain('file_mode=0755')
    expect(options).toContain('dir_mode=0755')
    expect(options).toContain('uid=1000')
    expect(options).toContain('gid=1000')
    expect(options).toContain('username=user1')
    expect(options).toContain('nobrl')
    expect(options).toContain('cache=loose')
    expect(options).toContain('iocharset=utf8')
    expect(options).toContain('vers=3.0')
  })

  it('createSafeMountOptions uses default uid/gid when not provided', () => {
    const options = createSafeMountOptions()
    expect(options).toContain('uid=1000')
    expect(options).toContain('gid=1000')
  })

  it('createSafeMountOptions uses default file/dir modes when not provided', () => {
    const options = createSafeMountOptions()
    expect(options).toContain('file_mode=0644')
    expect(options).toContain('dir_mode=0755')
  })

  it('createSafeMountOptions omits username when not provided', () => {
    const options = createSafeMountOptions()
    expect(options).not.toContain('username=')
  })

  it('createSafeMountOptions includes username when provided', () => {
    const options = createSafeMountOptions('admin')
    expect(options).toContain('username=admin')
  })
})

describe('smb api retry logic regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('mountSmbShareWithRetry calls mountAllSmbShares on success', async () => {
    const successResponse = { status: 'success', data: { id: 1 }, message: 'Added' }
    const mountAllResponse = { status: 'success', data: { service: 'hifiberry-smb' }, message: 'Mounted' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, successResponse))
      .mockResolvedValueOnce(jsonResponse(200, mountAllResponse))
    vi.stubGlobal('fetch', fetchMock)

    const result = await mountSmbShareWithRetry({ server: '192.168.1.27', share: 'music' })

    expect(result.status).toBe('success')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain('/smb/mount-all')
  })

  it('mountSmbShareWithRetry retries with minimal options on first failure', async () => {
    const failResponse = { status: 'error', message: 'Capability issue' }
    const retrySuccessResponse = { status: 'success', data: { id: 1 }, message: 'Added' }
    const mountAllResponse = { status: 'success', data: {}, message: 'Mounted' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, failResponse))
      .mockResolvedValueOnce(jsonResponse(200, retrySuccessResponse))
      .mockResolvedValueOnce(jsonResponse(200, mountAllResponse))
    vi.stubGlobal('fetch', fetchMock)

    const result = await mountSmbShareWithRetry({ server: '192.168.1.27', share: 'music' })

    expect(result.status).toBe('success')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    // Second call should have minimal options
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(secondCallBody.options).toBe('rw,uid=1000,gid=1000,file_mode=0644,dir_mode=0755')
  })

  it('mountSmbShareWithRetry returns original result when mount-all fails', async () => {
    const configResponse = { status: 'success', data: { id: 1 }, message: 'Configuration added' }
    const mountAllErrorResponse = jsonResponse(500, { message: 'Mount service failed' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, configResponse))
      .mockResolvedValueOnce(mountAllErrorResponse)
    vi.stubGlobal('fetch', fetchMock)

    const result = await mountSmbShareWithRetry({ server: '192.168.1.27', share: 'music' })

    // Should return the configuration result, not throw
    expect(result.status).toBe('success')
    expect(result.message).toBe('Configuration added')
  })

  it('unmountSmbShare calls mountAllSmbShares after removal', async () => {
    const removeResponse = { status: 'success', message: 'Removed' }
    const mountAllResponse = { status: 'success', data: {}, message: 'Updated' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, removeResponse))
      .mockResolvedValueOnce(jsonResponse(200, mountAllResponse))
    vi.stubGlobal('fetch', fetchMock)

    const result = await unmountSmbShare('192.168.1.27', 'music')

    expect(result.status).toBe('success')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain('/smb/mount-all')
  })

  it('mountSmbShare does not call mountAllSmbShares', async () => {
    const response = { status: 'success', data: { id: 1 }, message: 'Added' }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, response))
    vi.stubGlobal('fetch', fetchMock)

    await mountSmbShare({ server: '192.168.1.27', share: 'music' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/smb/mount')
    expect(fetchMock.mock.calls[0][0]).not.toContain('/smb/mount-all')
  })

  it('mountSmbShareWithRetry respects custom version parameter', async () => {
    const successResponse = { status: 'success', data: { id: 1 }, message: 'Added' }
    const mountAllResponse = { status: 'success', data: {}, message: 'Mounted' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, successResponse))
      .mockResolvedValueOnce(jsonResponse(200, mountAllResponse))
    vi.stubGlobal('fetch', fetchMock)

    await mountSmbShareWithRetry({
      server: '192.168.1.27',
      share: 'music',
      version: '2.0',
    })

    const firstCallBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(firstCallBody.options).toContain('vers=2.0')
    expect(firstCallBody.options).not.toContain('vers=3.0')
  })
})

describe('smb api capability and diagnostic tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('checkSmbCapabilities makes GET request', async () => {
    const capResponse = {
      status: 'success',
      data: {
        cifs_utils_installed: true,
        mount_cifs_available: true,
        supported_versions: ['3.0', '2.1'],
      },
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, capResponse))
    vi.stubGlobal('fetch', fetchMock)

    await checkSmbCapabilities()

    expect(fetchMock.mock.calls[0][0]).toContain('/smb/capabilities')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('getSmbMountDiagnostics makes GET request with mount id', async () => {
    const diagResponse = {
      status: 'success',
      data: {
        mount_id: 1,
        mounted: true,
      },
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, diagResponse))
    vi.stubGlobal('fetch', fetchMock)

    await getSmbMountDiagnostics(1)

    expect(fetchMock.mock.calls[0][0]).toContain('/smb/mounts/1/diagnostics')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('getSmbServers makes GET request', async () => {
    const response = { status: 'success', data: { servers: [] } }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, response))
    vi.stubGlobal('fetch', fetchMock)

    await getSmbServers()

    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
    expect(fetchMock.mock.calls[0][0]).toContain('/smb/servers')
  })
})
