/**
 * MusicBrainz API Service
 * https://musicbrainz.org/doc/MusicBrainz_API
 */

export interface MusicBrainzArtist {
  id: string
  name: string
  'sort-name': string
  disambiguation?: string
  type?: string
  'type-id'?: string
  gender?: string
  'gender-id'?: string
  country?: string
  'life-span'?: {
    begin?: string
    end?: string
    ended?: boolean
  }
  area?: {
    id: string
    name: string
    'sort-name': string
    'iso-3166-1-codes'?: string[]
  }
  'begin-area'?: {
    id: string
    name: string
    'sort-name': string
  }
  aliases?: Array<{
    name: string
    'sort-name': string
    type?: string
    'type-id'?: string
    primary?: boolean
    locale?: string
  }>
  tags?: Array<{
    count: number
    name: string
  }>
}

export interface MusicBrainzResponse {
  id: string
  name: string
  'sort-name': string
  disambiguation?: string
  type?: string
  gender?: string
  country?: string
  'life-span'?: {
    begin?: string
    end?: string
    ended?: boolean
  }
  area?: {
    name: string
  }
  'begin-area'?: {
    name: string
  }
  aliases?: Array<{
    name: string
    type?: string
    primary?: boolean
    locale?: string
  }>
  tags?: Array<{
    count: number
    name: string
  }>
}

class MusicBrainzService {
  private readonly baseUrl = 'https://musicbrainz.org/ws/2'
  private readonly userAgent = 'HBos-UI/1.0.0 ( https://github.com/hifiberry/hbos-ui )'

  private getYear(dateValue?: string): number | null {
    if (!dateValue) return null
    const year = new Date(dateValue).getFullYear()
    return Number.isNaN(year) ? null : year
  }

  private normalizeLocationName(name: string): string {
    return name.trim().toLocaleLowerCase()
  }

  private async fetchWithUserAgent(url: string): Promise<Response> {
    return fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    })
  }

  /**
   * Get artist information by MBID
   * @param mbid MusicBrainz ID of the artist
   * @returns Artist information
   */
  async getArtist(mbid: string): Promise<MusicBrainzResponse | null> {
    const normalizedMbid = mbid.trim()
    if (!normalizedMbid) return null

    try {
      const query = new URLSearchParams({
        fmt: 'json',
        inc: 'aliases+tags+area-rels'
      })
      const url = `${this.baseUrl}/artist/${encodeURIComponent(normalizedMbid)}?${query.toString()}`
      const response = await this.fetchWithUserAgent(url)

      if (!response.ok) {
        console.warn(`MusicBrainz API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data: MusicBrainzArtist = await response.json()
      const filteredAliases = data.aliases?.filter(alias => alias.primary || alias.locale === 'en')
      const sortedTags = data.tags
        ? [...data.tags].sort((a, b) => b.count - a.count).slice(0, 10)
        : undefined

      // Transform the response to a more usable format
      return {
        id: data.id,
        name: data.name,
        'sort-name': data['sort-name'],
        disambiguation: data.disambiguation,
        type: data.type,
        gender: data.gender,
        country: data.country,
        'life-span': data['life-span'],
        area: data.area ? { name: data.area.name } : undefined,
        'begin-area': data['begin-area'] ? { name: data['begin-area'].name } : undefined,
        aliases: filteredAliases,
        tags: sortedTags,
      }
    } catch (error) {
      console.error('Error fetching artist from MusicBrainz:', error)
      return null
    }
  }

  /**
   * Format life span for display
   * @param lifeSpan Life span object from MusicBrainz
   * @returns Formatted life span string
   */
  formatLifeSpan(lifeSpan?: { begin?: string; end?: string; ended?: boolean }): string | null {
    if (!lifeSpan) return null

    const beginYear = this.getYear(lifeSpan.begin)
    const endYear = this.getYear(lifeSpan.end)

    if (lifeSpan.ended) {
      const begin = beginYear ?? '?'
      const end = endYear ?? '?'
      return `${begin} - ${end}`
    } else if (beginYear !== null) {
      return `${beginYear} - present`
    }

    return null
  }

  /**
   * Get the primary genre/tag for an artist
   * @param tags Array of tags from MusicBrainz
   * @returns Primary genre or null
   */
  getPrimaryGenre(tags?: Array<{ count: number; name: string }>): string | null {
    if (!tags || tags.length === 0) return null
    const firstNonEmpty = tags.find(tag => tag.name.trim().length > 0)
    return firstNonEmpty ? firstNonEmpty.name : null
  }

  /**
   * Get formatted location string
   * @param area Current area
   * @param beginArea Birth area
   * @returns Formatted location string
   */
  getFormattedLocation(area?: { name: string }, beginArea?: { name: string }): string | null {
    const areaName = area?.name.trim()
    const beginAreaName = beginArea?.name.trim()

    if (areaName && beginAreaName && this.normalizeLocationName(areaName) !== this.normalizeLocationName(beginAreaName)) {
      return `${beginAreaName} / ${areaName}`
    } else if (areaName) {
      return areaName
    } else if (beginAreaName) {
      return beginAreaName
    } else if (area) {
      return area.name
    } else if (beginArea) {
      return beginArea.name
    }
    return null
  }
}

export const musicBrainzService = new MusicBrainzService()
