import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useFavourites } from '@/composables/useFavourites'

const mockState = vi.hoisted(() => ({
  libraryFetchMock: vi.fn(),
  jsonMock: vi.fn(),
  postMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/composables/useLibraryFetch', () => ({
  useLibraryFetch: () => mockState.libraryFetchMock,
}))

const song = {
  artist: 'Massive Attack',
  title: 'Teardrop',
}

const queueJsonResponse = (payload: { error?: unknown; data?: unknown }) => {
  mockState.jsonMock.mockResolvedValueOnce({
    error: ref(payload.error ?? null),
    data: ref(payload.data ?? null),
  })
}

describe('useFavourites', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockState.postMock.mockReturnValue({
      json: mockState.jsonMock,
    })

    mockState.deleteMock.mockReturnValue({
      json: mockState.jsonMock,
    })

    mockState.libraryFetchMock.mockImplementation(() => ({
      json: mockState.jsonMock,
      post: mockState.postMock,
      delete: mockState.deleteMock,
    }))
  })

  it('getProviders loads providers and updates hasProviders', async () => {
    const composable = useFavourites()
    const payload = {
      enabled_providers: ['lastfm'],
      total_providers: 2,
      enabled_count: 1,
    }

    queueJsonResponse({ data: payload })

    const result = await composable.getProviders()

    expect(mockState.libraryFetchMock).toHaveBeenCalledWith('/favourites/providers')
    expect(result).toEqual(payload)
    expect(composable.providers.value).toEqual(payload)
    expect(composable.hasProviders.value).toBe(true)
    expect(composable.error.value).toBeNull()
    expect(composable.loading.value).toBe(false)
  })

  it('getProviders handles fetch error and keeps hasProviders false', async () => {
    const composable = useFavourites()

    queueJsonResponse({ error: new Error('backend offline') })

    const result = await composable.getProviders()

    expect(result).toBeNull()
    expect(composable.providers.value).toBeNull()
    expect(composable.hasProviders.value).toBeNull()
    expect(composable.error.value).toBe('Failed to fetch providers')
    expect(composable.loading.value).toBe(false)
  })

  it('getProviders handles thrown errors with normalized message', async () => {
    const composable = useFavourites()

    mockState.libraryFetchMock.mockImplementationOnce(() => {
      throw new Error('network down')
    })

    const result = await composable.getProviders()

    expect(result).toBeNull()
    expect(composable.error.value).toBe('network down')
    expect(composable.loading.value).toBe(false)
  })

  it('getProviders uses unknown error fallback for non-Error throws', async () => {
    const composable = useFavourites()

    mockState.libraryFetchMock.mockImplementationOnce(() => {
      throw 'offline'
    })

    const result = await composable.getProviders()

    expect(result).toBeNull()
    expect(composable.error.value).toBe('Unknown error')
    expect(composable.loading.value).toBe(false)
  })

  it('isFavourite validates required song fields', async () => {
    const composable = useFavourites()

    const result = await composable.isFavourite({ artist: '', title: 'Song' })

    expect(result).toBe(false)
    expect(mockState.libraryFetchMock).not.toHaveBeenCalled()
  })

  it('isFavourite returns true when backend Ok says favourite', async () => {
    const composable = useFavourites()

    queueJsonResponse({
      data: {
        Ok: {
          is_favourite: true,
          providers: ['lastfm'],
        },
      },
    })

    const result = await composable.isFavourite(song)

    expect(result).toBe(true)
    expect(mockState.libraryFetchMock.mock.calls[0][0]).toContain('/favourites/is_favourite?')
    expect(mockState.libraryFetchMock.mock.calls[0][0]).toContain('artist=Massive+Attack')
    expect(mockState.libraryFetchMock.mock.calls[0][0]).toContain('title=Teardrop')
  })

  it('isFavourite returns false for fetch error, missing data, Err payload, and thrown error', async () => {
    const composable = useFavourites()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    queueJsonResponse({ error: new Error('request failed') })
    await expect(composable.isFavourite(song)).resolves.toBe(false)

    queueJsonResponse({ data: null })
    await expect(composable.isFavourite(song)).resolves.toBe(false)

    queueJsonResponse({ data: { Err: { error: 'denied' } } })
    await expect(composable.isFavourite(song)).resolves.toBe(false)

    mockState.libraryFetchMock.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    await expect(composable.isFavourite(song)).resolves.toBe(false)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking favourite status:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('getFavouriteDetails returns details for Ok and null otherwise', async () => {
    const composable = useFavourites()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    queueJsonResponse({
      data: {
        Ok: {
          is_favourite: false,
          providers: ['spotify'],
        },
      },
    })
    await expect(composable.getFavouriteDetails(song)).resolves.toEqual({
      is_favourite: false,
      providers: ['spotify'],
    })

    queueJsonResponse({ error: new Error('backend failed') })
    await expect(composable.getFavouriteDetails(song)).resolves.toBeNull()

    queueJsonResponse({ data: { Err: { error: 'nope' } } })
    await expect(composable.getFavouriteDetails(song)).resolves.toBeNull()

    mockState.libraryFetchMock.mockImplementationOnce(() => {
      throw new Error('broken')
    })
    await expect(composable.getFavouriteDetails(song)).resolves.toBeNull()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting favourite details:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('getFavouriteDetails returns null and does not fetch for invalid song', async () => {
    const composable = useFavourites()

    const result = await composable.getFavouriteDetails({ artist: 'Artist', title: '' })

    expect(result).toBeNull()
    expect(mockState.libraryFetchMock).not.toHaveBeenCalled()
  })

  it('addToFavourites validates inputs and handles success/error branches', async () => {
    const composable = useFavourites()

    await expect(composable.addToFavourites({ artist: '', title: 'Song' })).resolves.toBe(false)
    expect(composable.error.value).toBe('Artist and title are required')

    queueJsonResponse({
      data: {
        Ok: {
          success: true,
          message: 'added',
          providers: ['lastfm'],
          updated_providers: ['lastfm'],
        },
      },
    })
    await expect(composable.addToFavourites(song)).resolves.toBe(true)

    queueJsonResponse({
      data: {
        Err: {
          error: 'already exists',
        },
      },
    })
    await expect(composable.addToFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('already exists')

    queueJsonResponse({ data: null })
    await expect(composable.addToFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('Failed to add to favourites')

    queueJsonResponse({ error: new Error('request failed') })
    await expect(composable.addToFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('Failed to add to favourites')

    mockState.postMock.mockImplementationOnce(() => {
      throw new Error('write failed')
    })
    await expect(composable.addToFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('write failed')
    expect(composable.loading.value).toBe(false)

    expect(mockState.libraryFetchMock).toHaveBeenCalledWith('/favourites/add')
  })

  it('removeFromFavourites validates inputs and handles success/error branches', async () => {
    const composable = useFavourites()

    await expect(composable.removeFromFavourites({ artist: 'Artist', title: '' })).resolves.toBe(false)
    expect(composable.error.value).toBe('Artist and title are required')

    queueJsonResponse({
      data: {
        Ok: {
          success: true,
          message: 'removed',
          providers: ['lastfm'],
          updated_providers: [],
        },
      },
    })
    await expect(composable.removeFromFavourites(song)).resolves.toBe(true)

    queueJsonResponse({
      data: {
        Err: {
          error: 'not found',
        },
      },
    })
    await expect(composable.removeFromFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('not found')

    queueJsonResponse({ data: null })
    await expect(composable.removeFromFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('Failed to remove from favourites')

    queueJsonResponse({ error: new Error('request failed') })
    await expect(composable.removeFromFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('Failed to remove from favourites')

    mockState.deleteMock.mockImplementationOnce(() => {
      throw new Error('delete failed')
    })
    await expect(composable.removeFromFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('delete failed')
    expect(composable.loading.value).toBe(false)

    expect(mockState.libraryFetchMock).toHaveBeenCalledWith('/favourites/remove')
  })

  it('addToFavourites and removeFromFavourites use unknown error fallback when non-Error is thrown', async () => {
    const composable = useFavourites()

    mockState.postMock.mockImplementationOnce(() => {
      throw 'post exploded'
    })
    await expect(composable.addToFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('Unknown error')
    expect(composable.loading.value).toBe(false)

    mockState.deleteMock.mockImplementationOnce(() => {
      throw 'delete exploded'
    })
    await expect(composable.removeFromFavourites(song)).resolves.toBe(false)
    expect(composable.error.value).toBe('Unknown error')
    expect(composable.loading.value).toBe(false)
  })

  it('returns false when add/remove receive payload without Ok or Err', async () => {
    const composable = useFavourites()

    queueJsonResponse({ data: {} })
    await expect(composable.addToFavourites(song)).resolves.toBe(false)

    queueJsonResponse({ data: {} })
    await expect(composable.removeFromFavourites(song)).resolves.toBe(false)
  })

  it('toggleFavourite removes when currently favourite and adds otherwise', async () => {
    const composable = useFavourites()

    queueJsonResponse({
      data: {
        Ok: {
          is_favourite: true,
          providers: ['lastfm'],
        },
      },
    })
    queueJsonResponse({
      data: {
        Ok: {
          success: true,
          message: 'removed',
          providers: ['lastfm'],
          updated_providers: [],
        },
      },
    })

    await expect(composable.toggleFavourite(song)).resolves.toBe(true)

    queueJsonResponse({
      data: {
        Ok: {
          is_favourite: false,
          providers: [],
        },
      },
    })
    queueJsonResponse({
      data: {
        Ok: {
          success: true,
          message: 'added',
          providers: ['lastfm'],
          updated_providers: ['lastfm'],
        },
      },
    })

    await expect(composable.toggleFavourite(song)).resolves.toBe(true)
  })
})
