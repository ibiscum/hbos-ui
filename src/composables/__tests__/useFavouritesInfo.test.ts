import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useFavouritesInfo } from '@/composables/useFavouritesInfo'

const mockState = vi.hoisted(() => ({
  libraryFetchMock: vi.fn(),
  jsonMock: vi.fn(),
}))

vi.mock('@/composables/useLibraryFetch', () => ({
  useLibraryFetch: () => mockState.libraryFetchMock,
}))

const makeFavouritesInfo = () => ({
  enabled_providers: ['lastfm'],
  total_providers: 2,
  enabled_count: 1,
  providers: [
    {
      name: 'lastfm',
      display_name: 'Last.fm',
      enabled: true,
      active: true,
      favourite_count: 42,
    },
    {
      name: 'spotify',
      enabled: false,
      active: false,
      favourite_count: null,
    },
  ],
})

const queueJsonResponse = (payload: { error?: unknown; data?: unknown }) => {
  mockState.jsonMock.mockResolvedValueOnce({
    error: ref(payload.error ?? null),
    data: ref(payload.data ?? null),
  })
}

describe('useFavouritesInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.libraryFetchMock.mockReturnValue({
      json: mockState.jsonMock,
    })
  })

  it('loads favourites info and updates reactive state', async () => {
    const composable = useFavouritesInfo()
    const payload = makeFavouritesInfo()

    queueJsonResponse({ data: payload })

    const result = await composable.getFavouritesInfo()

    expect(mockState.libraryFetchMock).toHaveBeenCalledWith('/favourites/providers')
    expect(result).toEqual(payload)
    expect(composable.favouritesInfo.value).toEqual(payload)
    expect(composable.error.value).toBeNull()
    expect(composable.loading.value).toBe(false)
  })

  it('sets a formatted error for fetch errors and clears stale info (regression)', async () => {
    const composable = useFavouritesInfo()
    const payload = makeFavouritesInfo()

    queueJsonResponse({ data: payload })
    await composable.getFavouritesInfo()

    queueJsonResponse({ error: new Error('backend offline') })

    const result = await composable.getFavouritesInfo()

    expect(result).toBeNull()
    expect(composable.favouritesInfo.value).toBeNull()
    expect(composable.error.value).toBe('Failed to fetch favourites info: backend offline')
    expect(composable.loading.value).toBe(false)
  })

  it('serializes object-shaped fetch errors for diagnostics', async () => {
    const composable = useFavouritesInfo()

    queueJsonResponse({ error: { code: 502, reason: 'bad gateway' } })

    const result = await composable.getFavouritesInfo()

    expect(result).toBeNull()
    expect(composable.error.value).toBe('Failed to fetch favourites info: {"code":502,"reason":"bad gateway"}')
    expect(composable.favouritesInfo.value).toBeNull()
  })

  it('returns null for empty data and clears stale state (regression)', async () => {
    const composable = useFavouritesInfo()
    const payload = makeFavouritesInfo()

    queueJsonResponse({ data: payload })
    await composable.getFavouritesInfo()

    queueJsonResponse({ data: null })

    const result = await composable.getFavouritesInfo()

    expect(result).toBeNull()
    expect(composable.favouritesInfo.value).toBeNull()
    expect(composable.error.value).toBe('No data received')
  })

  it('handles thrown request errors with consistent messaging', async () => {
    const composable = useFavouritesInfo()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockState.libraryFetchMock.mockImplementationOnce(() => {
      throw new Error('network down')
    })

    const result = await composable.getFavouritesInfo()

    expect(result).toBeNull()
    expect(composable.favouritesInfo.value).toBeNull()
    expect(composable.error.value).toBe('Failed to fetch favourites info: network down')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching favourites info:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('returns provider status text and class for all state combinations', () => {
    const composable = useFavouritesInfo()

    const disabledProvider = {
      name: 'disabled',
      enabled: false,
      active: false,
      favourite_count: null,
    }
    const inactiveProvider = {
      name: 'inactive',
      enabled: true,
      active: false,
      favourite_count: 1,
    }
    const activeProvider = {
      name: 'active',
      enabled: true,
      active: true,
      favourite_count: 1,
    }

    expect(composable.getProviderStatusText(disabledProvider)).toBe('Disabled')
    expect(composable.getProviderStatusText(inactiveProvider)).toBe('Enabled (Inactive)')
    expect(composable.getProviderStatusText(activeProvider)).toBe('Active')

    expect(composable.getProviderStatusClass(disabledProvider)).toBe('status-disabled')
    expect(composable.getProviderStatusClass(inactiveProvider)).toBe('status-inactive')
    expect(composable.getProviderStatusClass(activeProvider)).toBe('status-active')
  })
})
