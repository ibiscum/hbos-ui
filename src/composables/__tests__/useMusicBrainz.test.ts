import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMusicBrainz } from '@/composables/useMusicBrainz'
import type { MusicBrainzResponse } from '@/services/musicbrainz'

const mockState = vi.hoisted(() => ({
  getArtistMock: vi.fn(),
  formatLifeSpanMock: vi.fn(),
  getPrimaryGenreMock: vi.fn(),
  getFormattedLocationMock: vi.fn(),
}))

vi.mock('@/services/musicbrainz', () => ({
  musicBrainzService: {
    getArtist: (...args: unknown[]) => mockState.getArtistMock(...args),
    formatLifeSpan: (...args: unknown[]) => mockState.formatLifeSpanMock(...args),
    getPrimaryGenre: (...args: unknown[]) => mockState.getPrimaryGenreMock(...args),
    getFormattedLocation: (...args: unknown[]) => mockState.getFormattedLocationMock(...args),
  },
}))

const makeArtist = (overrides: Partial<MusicBrainzResponse> = {}): MusicBrainzResponse => ({
  id: 'artist-1',
  name: 'The Artist',
  'sort-name': 'Artist, The',
  'life-span': { begin: '2000-01-01', ended: false },
  area: { name: 'Berlin' },
  'begin-area': { name: 'Leeds' },
  tags: [
    { count: 10, name: 'rock' },
    { count: 9, name: 'indie' },
    { count: 8, name: 'alternative' },
    { count: 7, name: 'electronic' },
    { count: 6, name: 'dance' },
    { count: 5, name: 'ambient' },
  ],
  ...overrides,
})

describe('useMusicBrainz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.getArtistMock.mockResolvedValue(makeArtist())
    mockState.formatLifeSpanMock.mockReturnValue('2000 - present')
    mockState.getPrimaryGenreMock.mockReturnValue('rock')
    mockState.getFormattedLocationMock.mockReturnValue('Leeds / Berlin')
  })

  it('starts with default reactive state', () => {
    const composable = useMusicBrainz()

    expect(composable.artistData.value).toBeNull()
    expect(composable.loading.value).toBe(false)
    expect(composable.error.value).toBeNull()
    expect(composable.formattedLifeSpan.value).toBeNull()
    expect(composable.primaryGenre.value).toBeNull()
    expect(composable.formattedLocation.value).toBeNull()
    expect(composable.topTags.value).toEqual([])
  })

  it('fetches artist data and updates derived fields', async () => {
    const composable = useMusicBrainz()

    await composable.fetchArtist(' mbid-123 ')

    expect(mockState.getArtistMock).toHaveBeenCalledTimes(1)
    expect(mockState.getArtistMock).toHaveBeenCalledWith('mbid-123')
    expect(composable.loading.value).toBe(false)
    expect(composable.error.value).toBeNull()
    expect(composable.artistData.value?.id).toBe('artist-1')

    expect(composable.formattedLifeSpan.value).toBe('2000 - present')
    expect(composable.primaryGenre.value).toBe('rock')
    expect(composable.formattedLocation.value).toBe('Leeds / Berlin')

    expect(mockState.formatLifeSpanMock).toHaveBeenCalledWith({ begin: '2000-01-01', ended: false })
    expect(mockState.getPrimaryGenreMock).toHaveBeenCalledWith(composable.artistData.value?.tags)
    expect(mockState.getFormattedLocationMock).toHaveBeenCalledWith(
      composable.artistData.value?.area,
      composable.artistData.value?.['begin-area'],
    )
  })

  it('returns top five tags only and does not mutate source tags (regression)', async () => {
    const composable = useMusicBrainz()
    const inputTags = [
      { count: 10, name: 'rock' },
      { count: 9, name: 'indie' },
      { count: 8, name: 'alternative' },
      { count: 7, name: 'electronic' },
      { count: 6, name: 'dance' },
      { count: 5, name: 'ambient' },
    ]

    mockState.getArtistMock.mockResolvedValueOnce(makeArtist({ tags: inputTags }))

    await composable.fetchArtist('mbid-123')

    expect(composable.topTags.value).toEqual([
      { count: 10, name: 'rock' },
      { count: 9, name: 'indie' },
      { count: 8, name: 'alternative' },
      { count: 7, name: 'electronic' },
      { count: 6, name: 'dance' },
    ])
    expect(inputTags).toEqual([
      { count: 10, name: 'rock' },
      { count: 9, name: 'indie' },
      { count: 8, name: 'alternative' },
      { count: 7, name: 'electronic' },
      { count: 6, name: 'dance' },
      { count: 5, name: 'ambient' },
    ])
  })

  it('skips fetch for whitespace MBID and keeps current state unchanged (regression)', async () => {
    const composable = useMusicBrainz()

    await composable.fetchArtist('mbid-123')
    const previousArtistId = composable.artistData.value?.id

    await composable.fetchArtist('   ')

    expect(mockState.getArtistMock).toHaveBeenCalledTimes(1)
    expect(composable.artistData.value?.id).toBe(previousArtistId)
    expect(composable.error.value).toBeNull()
    expect(composable.loading.value).toBe(false)
  })

  it('clears stale artist data and sets fallback error when service returns null (regression)', async () => {
    const composable = useMusicBrainz()

    await composable.fetchArtist('mbid-123')
    mockState.getArtistMock.mockResolvedValueOnce(null)

    await composable.fetchArtist('mbid-456')

    expect(composable.artistData.value).toBeNull()
    expect(composable.error.value).toBe('Failed to fetch artist data')
    expect(composable.loading.value).toBe(false)
  })

  it('surfaces thrown Error messages from fetch failures', async () => {
    const composable = useMusicBrainz()
    mockState.getArtistMock.mockRejectedValueOnce(new Error('network down'))

    await composable.fetchArtist('mbid-123')

    expect(composable.artistData.value).toBeNull()
    expect(composable.error.value).toBe('network down')
    expect(composable.loading.value).toBe(false)
  })

  it('falls back to generic message for non-Error throwables', async () => {
    const composable = useMusicBrainz()
    mockState.getArtistMock.mockRejectedValueOnce('offline')

    await composable.fetchArtist('mbid-123')

    expect(composable.error.value).toBe('Failed to fetch artist data')
    expect(composable.loading.value).toBe(false)
  })
})
