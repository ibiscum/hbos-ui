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
})
