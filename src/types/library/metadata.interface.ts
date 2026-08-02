/**
 * Metadata interface for enriched artist information.
 *
 * Provides additional metadata about artists including identifiers,
 * visual assets, biographical information, and categorization.
 *
 * @remarks
 * - Array fields (mbid, thumb_url, banner_url, genres) may be empty
 * - URL fields follow the host's path format (relative or absolute)
 * - biography field may be empty string if unavailable
 * - This interface is typically populated from external metadata services
 *   like MusicBrainz or AudioControl REST API
 */
export interface Metadata {
  /**
   * MusicBrainz identifiers for the artist.
   * @type {string[]}
   * @remarks
   * - Array of unique MusicBrainz IDs
   * - Usually contains 0-1 primary ID, but may contain multiple entries
   * - Empty array if no MusicBrainz data available
   */
  mbid: string[]

  /**
   * Thumbnail image URLs for the artist.
   * @type {string[]}
   * @remarks
   * - Array of image URLs pointing to thumbnail-sized artwork
   * - May contain relative or absolute paths
   * - Empty array if no thumbnails available
   * - Typically used for list/grid displays
   */
  thumb_url: string[]

  /**
   * Banner image URLs for the artist.
   * @type {string[]}
   * @remarks
   * - Array of image URLs pointing to banner-sized artwork
   * - May contain relative or absolute paths
   * - Empty array if no banners available
   * - Typically used for header/hero displays
   */
  banner_url: string[]

  /**
   * Artist biography or description text.
   * @type {string}
   * @remarks
   * - Plain text or formatted biography about the artist
   * - May be empty string if unavailable
   * - Sourced from metadata providers (AudioControl, MusicBrainz)
   * - May contain multiple paragraphs or special characters
   */
  biography: string

  /**
   * Music genres associated with the artist.
   * @type {string[]}
   * @remarks
   * - Array of genre tags or categories
   * - May contain duplicates if multiple sources report same genre
   * - Empty array if no genre information available
   * - Sourced from metadata providers and user input
   */
  genres: string[]
}
