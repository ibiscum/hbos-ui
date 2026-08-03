import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLibraryFetch } from '@/composables/useLibraryFetch'

const mockState = vi.hoisted(() => ({
  createFetchMock: vi.fn(),
  getApiBaseUrlMock: vi.fn(() => 'http://device.local'),
  getAvailableLibraryMock: vi.fn(),
  fetchInstance: vi.fn(),
  libraryStore: {
    isAvailableLibrary: true,
    activeLibrary: 'mpd' as string | null,
    getAvailableLibrary: vi.fn(),
  },
}))

vi.mock('@vueuse/core', () => ({
  createFetch: (...args: unknown[]) => mockState.createFetchMock(...args),
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: mockState.getApiBaseUrlMock,
  }),
}))

vi.mock('@/stores/library', () => ({
  useLibraryStore: () => mockState.libraryStore,
}))

describe('useLibraryFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.fetchInstance = vi.fn()
    mockState.createFetchMock.mockReturnValue(mockState.fetchInstance)
    mockState.libraryStore.isAvailableLibrary = true
    mockState.libraryStore.activeLibrary = 'mpd'
    mockState.getAvailableLibraryMock = vi.fn()
    mockState.libraryStore.getAvailableLibrary = mockState.getAvailableLibraryMock
    mockState.getApiBaseUrlMock.mockReturnValue('http://device.local')
  })

  it('creates fetch instance with configured base URL and overwrite combination', () => {
    const fetcher = useLibraryFetch()

    expect(fetcher).toBe(mockState.fetchInstance)
    expect(mockState.createFetchMock).toHaveBeenCalledTimes(1)

    const config = mockState.createFetchMock.mock.calls[0]?.[0]
    expect(config.baseUrl).toBe('http://device.local')
    expect(config.combination).toBe('overwrite')
    expect(typeof config.options.beforeFetch).toBe('function')
  })

  it('replaces active library placeholder in request URL when library is available', async () => {
    useLibraryFetch()
    const config = mockState.createFetchMock.mock.calls[0]?.[0]

    const result = await config.options.beforeFetch({
      url: '/library/:activeLibrary/albums?limit=10',
      options: { method: 'GET' },
      cancel: vi.fn(),
    })

    expect(mockState.getAvailableLibraryMock).not.toHaveBeenCalled()
    expect(result.url).toBe('/library/mpd/albums?limit=10')
  })

  it('loads available library before replacement when store is not initialized', async () => {
    mockState.libraryStore.isAvailableLibrary = false
    mockState.getAvailableLibraryMock.mockImplementation(async () => {
      mockState.libraryStore.activeLibrary = 'lms'
      return 'lms'
    })

    useLibraryFetch()
    const config = mockState.createFetchMock.mock.calls[0]?.[0]

    const result = await config.options.beforeFetch({
      url: '/player/:activeLibrary/queue',
      options: { method: 'GET' },
      cancel: vi.fn(),
    })

    expect(mockState.getAvailableLibraryMock).toHaveBeenCalledTimes(1)
    expect(result.url).toBe('/player/lms/queue')
  })

  it('matches placeholder replacement case-insensitively and at end-of-path boundaries', async () => {
    useLibraryFetch()
    const config = mockState.createFetchMock.mock.calls[0]?.[0]

    const first = await config.options.beforeFetch({
      url: '/library/:ActiveLibrary',
      options: {},
      cancel: vi.fn(),
    })

    const second = await config.options.beforeFetch({
      url: '/library/:ACTIVELIBRARY?offset=0',
      options: {},
      cancel: vi.fn(),
    })

    expect(first.url).toBe('/library/mpd')
    expect(second.url).toBe('/library/mpd?offset=0')
  })

  it('cancels request and keeps URL unchanged when library resolution throws', async () => {
    mockState.libraryStore.isAvailableLibrary = false
    mockState.getAvailableLibraryMock.mockRejectedValueOnce(new Error('device offline'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    useLibraryFetch()
    const config = mockState.createFetchMock.mock.calls[0]?.[0]
    const cancel = vi.fn()

    const result = await config.options.beforeFetch({
      url: '/library/:activeLibrary/albums',
      options: { method: 'GET' },
      cancel,
    })

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(result.url).toBe('/library/:activeLibrary/albums')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Active library resolution failed:',
      expect.any(Error),
    )

    consoleErrorSpy.mockRestore()
  })

  it('cancels request when active library is still missing after initialization (regression)', async () => {
    mockState.libraryStore.isAvailableLibrary = false
    mockState.libraryStore.activeLibrary = null
    mockState.getAvailableLibraryMock.mockResolvedValueOnce(null)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    useLibraryFetch()
    const config = mockState.createFetchMock.mock.calls[0]?.[0]
    const cancel = vi.fn()

    const result = await config.options.beforeFetch({
      url: '/library/:activeLibrary/albums',
      options: { method: 'GET' },
      cancel,
    })

    expect(mockState.getAvailableLibraryMock).toHaveBeenCalledTimes(1)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(result.url).toBe('/library/:activeLibrary/albums')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Active library is not available for request URL replacement',
    )

    consoleErrorSpy.mockRestore()
  })
})
