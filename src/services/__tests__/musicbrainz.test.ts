import { beforeEach, describe, expect, it, vi } from 'vitest'
import { musicBrainzService } from '@/services/musicbrainz'

interface MockResponseInit {
  status?: number
  statusText?: string
  body?: unknown
}

const mockResponse = ({ status = 200, statusText = 'OK', body = {} }: MockResponseInit = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  }) as Response

describe('musicBrainzService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns null and skips fetch when mbid is empty or whitespace', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(musicBrainzService.getArtist('')).resolves.toBeNull()
    await expect(musicBrainzService.getArtist('   ')).resolves.toBeNull()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches artist data and transforms aliases and tags deterministically', async () => {
    const inputTags = [
      { count: 2, name: 'rock' },
      { count: 20, name: 'alternative' },
      { count: 8, name: 'indie' },
    ]

    const payload = {
      id: 'artist-1',
      name: 'The Artist',
      'sort-name': 'Artist, The',
      disambiguation: 'UK band',
      type: 'Group',
      gender: 'N/A',
      country: 'GB',
      'life-span': { begin: '1999-01-01', ended: false },
      area: { id: 'a1', name: 'London', 'sort-name': 'London' },
      'begin-area': { id: 'a2', name: 'Leeds', 'sort-name': 'Leeds' },
      aliases: [
        { name: 'Alias 1', 'sort-name': 'Alias 1', primary: true, locale: 'en' },
        { name: 'Alias 2', 'sort-name': 'Alias 2', locale: 'en' },
        { name: 'Alias 3', 'sort-name': 'Alias 3', locale: 'de' },
      ],
      tags: inputTags,
    }

    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ body: payload }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await musicBrainzService.getArtist(' mbid/with spaces ')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(
      'https://musicbrainz.org/ws/2/artist/mbid%2Fwith%20spaces?fmt=json&inc=aliases%2Btags%2Barea-rels',
    )
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')
    expect((init.headers as Record<string, string>)['User-Agent']).toContain('HBos-UI/1.0.0')

    expect(result).toEqual({
      id: 'artist-1',
      name: 'The Artist',
      'sort-name': 'Artist, The',
      disambiguation: 'UK band',
      type: 'Group',
      gender: 'N/A',
      country: 'GB',
      'life-span': { begin: '1999-01-01', ended: false },
      area: { name: 'London' },
      'begin-area': { name: 'Leeds' },
      aliases: [
        { name: 'Alias 1', 'sort-name': 'Alias 1', primary: true, locale: 'en' },
        { name: 'Alias 2', 'sort-name': 'Alias 2', locale: 'en' },
      ],
      tags: [
        { count: 20, name: 'alternative' },
        { count: 8, name: 'indie' },
        { count: 2, name: 'rock' },
      ],
    })

    // Regression: sorting must not mutate source payload arrays.
    expect(payload.tags).toEqual(inputTags)
  })

  it('returns null and logs a warning when response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ status: 503, statusText: 'Service Unavailable' }))
    vi.stubGlobal('fetch', fetchMock)
    const warnSpy = vi.spyOn(console, 'warn')

    await expect(musicBrainzService.getArtist('abc')).resolves.toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith('MusicBrainz API error: 503 Service Unavailable')
  })

  it('returns null and logs an error when fetch throws', async () => {
    const fetchError = new Error('network down')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchError))
    const errorSpy = vi.spyOn(console, 'error')

    await expect(musicBrainzService.getArtist('abc')).resolves.toBeNull()

    expect(errorSpy).toHaveBeenCalledWith('Error fetching artist from MusicBrainz:', fetchError)
  })

  it('formats life span with robust date handling', () => {
    expect(musicBrainzService.formatLifeSpan()).toBeNull()
    expect(musicBrainzService.formatLifeSpan({ begin: '1999-10-12', ended: false })).toBe('1999 - present')
    expect(musicBrainzService.formatLifeSpan({ begin: '1970-01-01', end: '2003-07-01', ended: true })).toBe('1970 - 2003')
    expect(musicBrainzService.formatLifeSpan({ begin: 'invalid-date', ended: false })).toBeNull()
    expect(musicBrainzService.formatLifeSpan({ begin: 'invalid-date', end: 'invalid-date', ended: true })).toBe('? - ?')
  })

  it('returns primary genre using first non-empty tag name', () => {
    expect(musicBrainzService.getPrimaryGenre()).toBeNull()
    expect(musicBrainzService.getPrimaryGenre([])).toBeNull()
    expect(
      musicBrainzService.getPrimaryGenre([
        { count: 10, name: '   ' },
        { count: 9, name: 'rock' },
      ]),
    ).toBe('rock')
  })

  it('formats location consistently when names differ only by case/whitespace', () => {
    expect(musicBrainzService.getFormattedLocation()).toBeNull()
    expect(musicBrainzService.getFormattedLocation({ name: '  Berlin  ' }, { name: 'berlin' })).toBe('Berlin')
    expect(musicBrainzService.getFormattedLocation({ name: 'Germany' }, { name: 'Berlin' })).toBe('Berlin / Germany')
    expect(musicBrainzService.getFormattedLocation(undefined, { name: 'Leeds' })).toBe('Leeds')
  })
})
