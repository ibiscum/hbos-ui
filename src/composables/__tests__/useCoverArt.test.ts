import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCoverArt } from '@/composables/useCoverArt'
import type { CoverArtResult } from '@/services/coverartloader'
import type { Song } from '@/types/player'

const mockState = vi.hoisted(() => ({
  findCoverArtMock: vi.fn(),
  findCoverArtFromAPIMock: vi.fn(),
  isApiAvailableMock: vi.fn(),
}))

vi.mock('@/services/coverartloader', () => ({
  coverArtLoader: {
    findCoverArt: mockState.findCoverArtMock,
    findCoverArtFromAPI: mockState.findCoverArtFromAPIMock,
    isApiAvailable: mockState.isApiAvailableMock,
  },
}))

const makeResult = (overrides: Partial<CoverArtResult> = {}): CoverArtResult => ({
  success: true,
  urls: ['https://img.example/cover.jpg'],
  images: [{ url: 'https://img.example/cover.jpg' }],
  source: 'song',
  providers: [],
  ...overrides,
})

const makeSong = (overrides: Partial<Song> = {}): Song => ({
  title: 'Song Title',
  artist: 'Artist Name',
  album: 'Album Name',
  duration: 180,
  ...overrides,
})

describe('useCoverArt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.findCoverArtMock.mockResolvedValue(makeResult())
    mockState.findCoverArtFromAPIMock.mockResolvedValue(makeResult({ source: 'artist' }))
    mockState.isApiAvailableMock.mockResolvedValue(true)
  })

  it('loads cover art and updates reactive state', async () => {
    const coverArt = useCoverArt()
    const song = makeSong()

    const result = await coverArt.loadCoverArt(song)

    expect(mockState.findCoverArtMock).toHaveBeenCalledTimes(1)
    expect(mockState.findCoverArtMock).toHaveBeenCalledWith(song)
    expect(result.success).toBe(true)
    expect(coverArt.hasCoverArt.value).toBe(true)
    expect(coverArt.bestCoverArt.value).toBe('https://img.example/cover.jpg')
    expect(coverArt.coverArtSource.value).toBe('song')
  })

  it('uses cache for repeated song lookups', async () => {
    const coverArt = useCoverArt()
    const song = makeSong()

    await coverArt.loadCoverArt(song)
    await coverArt.loadCoverArt(makeSong({ title: '  Song Title  ', artist: 'artist name', album: 'album name' }))

    expect(mockState.findCoverArtMock).toHaveBeenCalledTimes(1)
    expect(coverArt.getCacheSize()).toBe(1)
  })

  it('regression: clearing a specific key invalidates the last-song cache shortcut', async () => {
    const coverArt = useCoverArt()
    const song = makeSong({ title: 'Song', artist: 'Artist', album: 'Album' })

    mockState.findCoverArtMock
      .mockResolvedValueOnce(makeResult({ urls: ['https://img.example/first.jpg'] }))
      .mockResolvedValueOnce(makeResult({ urls: ['https://img.example/second.jpg'] }))

    await coverArt.loadCoverArt(song)
    coverArt.clearCache('song|artist|album')
    const result = await coverArt.loadCoverArt(song)

    expect(mockState.findCoverArtMock).toHaveBeenCalledTimes(2)
    expect(result.urls[0]).toBe('https://img.example/second.jpg')
  })

  it('regression: loadCoverArtByMetadata trims input before loading', async () => {
    const coverArt = useCoverArt()

    await coverArt.loadCoverArtByMetadata('  Trimmed Song  ', '  Trimmed Artist  ')

    expect(mockState.findCoverArtMock).toHaveBeenCalledTimes(1)
    expect(mockState.findCoverArtMock).toHaveBeenCalledWith({
      title: 'Trimmed Song',
      artist: 'Trimmed Artist',
      duration: 0,
    })
  })

  it('returns empty result for whitespace-only metadata without API calls', async () => {
    const coverArt = useCoverArt()

    const result = await coverArt.loadCoverArtByMetadata('   ', 'Artist')

    expect(result.success).toBe(false)
    expect(result.source).toBe('none')
    expect(mockState.findCoverArtMock).not.toHaveBeenCalled()
  })

  it('returns false when API availability check throws', async () => {
    const coverArt = useCoverArt()
    mockState.isApiAvailableMock.mockRejectedValueOnce(new Error('offline'))

    await expect(coverArt.checkApiAvailability()).resolves.toBe(false)
  })

  it('returns empty result when loadCoverArt receives null song', async () => {
    const coverArt = useCoverArt()

    const result = await coverArt.loadCoverArt(null as unknown as Song)

    expect(result).toEqual({ success: false, urls: [], images: [], source: 'none', providers: [] })
    expect(coverArt.lastResult.value?.success).toBe(false)
    expect(mockState.findCoverArtMock).not.toHaveBeenCalled()
  })

  it('loads fresh when title or artist is missing and does not cache invalid keys', async () => {
    const coverArt = useCoverArt()
    const songMissingArtist = makeSong({ artist: '   ' })

    await coverArt.loadCoverArt(songMissingArtist)
    await coverArt.loadCoverArt(songMissingArtist)

    expect(mockState.findCoverArtMock).toHaveBeenCalledTimes(2)
    expect(coverArt.getCacheSize()).toBe(0)
  })

  it('handles loadCoverArt errors and exposes message', async () => {
    const coverArt = useCoverArt()
    mockState.findCoverArtMock.mockRejectedValueOnce(new Error('loader failed'))

    const result = await coverArt.loadCoverArt(makeSong())

    expect(result.success).toBe(false)
    expect(result.source).toBe('none')
    expect(coverArt.error.value).toBe('loader failed')
    expect(coverArt.loading.value).toBe(false)
  })

  it('getBestCoverArt returns null when load result has no urls', async () => {
    const coverArt = useCoverArt()
    mockState.findCoverArtMock.mockResolvedValueOnce(makeResult({ success: false, urls: [] }))

    const best = await coverArt.getBestCoverArt(makeSong())

    expect(best).toBeNull()
  })

  it('getBestCoverArt returns first URL when available', async () => {
    const coverArt = useCoverArt()
    mockState.findCoverArtMock.mockResolvedValueOnce(
      makeResult({ urls: ['https://img.example/first.jpg', 'https://img.example/second.jpg'] }),
    )

    const best = await coverArt.getBestCoverArt(makeSong())

    expect(best).toBe('https://img.example/first.jpg')
  })

  it('loadCoverArtByMetadata returns empty result when artist is missing', async () => {
    const coverArt = useCoverArt()

    const result = await coverArt.loadCoverArtByMetadata('Song', '   ')

    expect(result.success).toBe(false)
    expect(result.source).toBe('none')
    expect(mockState.findCoverArtMock).not.toHaveBeenCalled()
  })

  it('loadCoverArtFromAPI handles null song without API call', async () => {
    const coverArt = useCoverArt()

    const result = await coverArt.loadCoverArtFromAPI(null as unknown as Song)

    expect(result.success).toBe(false)
    expect(result.source).toBe('none')
    expect(mockState.findCoverArtFromAPIMock).not.toHaveBeenCalled()
  })

  it('loadCoverArtFromAPI updates result and resets last song key state', async () => {
    const coverArt = useCoverArt()

    const result = await coverArt.loadCoverArtFromAPI(makeSong())

    expect(result.source).toBe('artist')
    expect(coverArt.coverArtSource.value).toBe('artist')
    expect(coverArt.loading.value).toBe(false)
  })

  it('loadCoverArtFromAPI handles thrown errors with fallback message for non-Error', async () => {
    const coverArt = useCoverArt()
    mockState.findCoverArtFromAPIMock.mockRejectedValueOnce('boom')

    const result = await coverArt.loadCoverArtFromAPI(makeSong())

    expect(result.success).toBe(false)
    expect(result.source).toBe('none')
    expect(coverArt.error.value).toBe('Failed to load cover art from API')
  })

  it('clearCoverArt resets all reactive state', async () => {
    const coverArt = useCoverArt()
    await coverArt.loadCoverArt(makeSong())

    coverArt.clearCoverArt()

    expect(coverArt.lastResult.value).toBeNull()
    expect(coverArt.error.value).toBeNull()
    expect(coverArt.loading.value).toBe(false)
    expect(coverArt.coverArtUrls.value).toEqual([])
    expect(coverArt.bestCoverArt.value).toBeNull()
  })

  it('clearCache with key removes only normalized matching key', async () => {
    const coverArt = useCoverArt()
    await coverArt.loadCoverArt(makeSong({ title: 'Song A', artist: 'Artist A', album: 'Album A' }))
    await coverArt.loadCoverArt(makeSong({ title: 'Song B', artist: 'Artist B', album: 'Album B' }))

    expect(coverArt.getCacheSize()).toBe(2)

    coverArt.clearCache('  SONG A|ARTIST A|ALBUM A  ')

    expect(coverArt.getCacheSize()).toBe(1)
  })

  it('clearCache with whitespace key clears all cache', async () => {
    const coverArt = useCoverArt()
    await coverArt.loadCoverArt(makeSong({ title: 'Song A', artist: 'Artist A', album: 'Album A' }))
    await coverArt.loadCoverArt(makeSong({ title: 'Song B', artist: 'Artist B', album: 'Album B' }))

    coverArt.clearCache('   ')

    expect(coverArt.getCacheSize()).toBe(0)
  })

  it('clearCache without key clears all cache entries', async () => {
    const coverArt = useCoverArt()
    await coverArt.loadCoverArt(makeSong({ title: 'Song A', artist: 'Artist A', album: 'Album A' }))
    await coverArt.loadCoverArt(makeSong({ title: 'Song B', artist: 'Artist B', album: 'Album B' }))

    coverArt.clearCache()

    expect(coverArt.getCacheSize()).toBe(0)
  })

  it('checkApiAvailability returns true when loader resolves true', async () => {
    const coverArt = useCoverArt()
    mockState.isApiAvailableMock.mockResolvedValueOnce(true)

    await expect(coverArt.checkApiAvailability()).resolves.toBe(true)
  })

  it('preloadCoverArt delegates all songs to loader and preserves order', async () => {
    const coverArt = useCoverArt()
    const songs = [
      makeSong({ title: 'Song A', artist: 'Artist A' }),
      makeSong({ title: 'Song B', artist: 'Artist B' }),
    ]

    mockState.findCoverArtMock
      .mockResolvedValueOnce(makeResult({ urls: ['https://img.example/a.jpg'] }))
      .mockResolvedValueOnce(makeResult({ urls: ['https://img.example/b.jpg'] }))

    const results = await coverArt.preloadCoverArt(songs)

    expect(mockState.findCoverArtMock).toHaveBeenNthCalledWith(1, songs[0])
    expect(mockState.findCoverArtMock).toHaveBeenNthCalledWith(2, songs[1])
    expect(results[0].urls[0]).toBe('https://img.example/a.jpg')
    expect(results[1].urls[0]).toBe('https://img.example/b.jpg')
  })

  it('computed fields expose providers and none source when no result', () => {
    const coverArt = useCoverArt()

    expect(coverArt.coverArtSource.value).toBe('none')
    expect(coverArt.coverArtProviders.value).toEqual([])
    expect(coverArt.hasCoverArt.value).toBe(false)
  })

  it('does not cache when song title is whitespace-only after trim', async () => {
    const coverArt = useCoverArt()
    const song = makeSong({ title: '   ', artist: 'Artist Name' })

    await coverArt.loadCoverArt(song)
    await coverArt.loadCoverArt(song)

    expect(mockState.findCoverArtMock).toHaveBeenCalledTimes(2)
    expect(coverArt.getCacheSize()).toBe(0)
  })

  it('loadCoverArt uses unknown error fallback for non-Error rejection values', async () => {
    const coverArt = useCoverArt()
    mockState.findCoverArtMock.mockRejectedValueOnce('not-an-error')

    const result = await coverArt.loadCoverArt(makeSong())

    expect(result.success).toBe(false)
    expect(coverArt.error.value).toBe('Unknown error')
  })

  it('loadCoverArtFromAPI keeps Error message when rejection is an Error instance', async () => {
    const coverArt = useCoverArt()
    mockState.findCoverArtFromAPIMock.mockRejectedValueOnce(new Error('api exploded'))

    await coverArt.loadCoverArtFromAPI(makeSong())

    expect(coverArt.error.value).toBe('api exploded')
  })
})
