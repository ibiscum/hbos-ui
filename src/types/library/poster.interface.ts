/**
 * PosterItem Interface for UI Presentation Mapping
 *
 * Defines UI-layer mapping fields used for rendering poster cards in gallery views.
 * All fields use a `$` prefix to indicate they are presentation/mapping fields,
 * distinguishing them from semantic domain fields in derived interfaces.
 *
 * This interface is typically:
 * - Extended by Album and Artist interfaces for type-safe components
 * - Used with PosterGrid.vue generic component: `<PosterGrid<T extends PosterItem> />`
 * - Populated by store computed properties that transform API responses
 *
 * @remarks
 * The `$` prefix convention signals that these fields are for UI rendering only.
 * Consuming interfaces (Album, Artist) add semantic fields with regular names.
 *
 * @example
 * ```typescript
 * // In Album store:
 * const displayAlbum: Album = {
 *   id: 'album-1',
 *   name: 'Dark Side',
 *   artists: ['Pink Floyd'],
 *   // ... other semantic fields
 *   $id: 'album-1',              // Used as Vue key and DOM identifier
 *   $title: 'Dark Side',           // Used as primary display text
 *   $subtitle: 'Pink Floyd',       // Used as secondary display text
 *   $cover_src: '/covers/dsom.jpg' // Image source for poster thumbnail
 * }
 *
 * // In component:
 * <PosterGrid :items="albums" />
 * // Template uses: v-for="item in items" :key="item.$id" :title="item.$title"
 * ```
 */
export interface PosterItem {
  /**
   * Unique identifier for UI rendering and DOM queries.
   * @type {string | undefined}
   * @remarks
   * - Used as Vue v-for key: `:key="item.$id"`
   * - Used for DOM identification: `:data-id="item.$id"`
   * - Used for routing: `{ params: { albumId: item.$id } }`
   * - Used for scroll-to-element queries: `document.querySelector('[data-id="..."]')`
   * - Typically mapped from semantic id field: `$id: album.id`
   * - Should be unique within the displayed list
   */
  $id?: string

  /**
   * Primary display title for the poster item.
   * @type {string | undefined}
   * @remarks
   * - Used as HTML title attribute for tooltips: `:title="item.$title || ''"`
   * - Displayed as main heading in poster card
   * - Typically mapped from semantic name field: `$title: album.name`
   * - Can be truncated by CSS based on space constraints
   * - May contain special characters requiring HTML escaping
   */
  $title?: string

  /**
   * Secondary display text for additional context.
   * @type {string | undefined}
   * @remarks
   * - Displayed below or alongside the title in poster card
   * - For Albums: artist name or "Various Artists" fallback
   * - For Artists: album count like "15 albums"
   * - Typically constructed from semantic fields: `$subtitle: artists?.[0] || 'Various'`
   * - Can be empty string for items without context
   * - Smaller font size in UI compared to $title
   */
  $subtitle?: string

  /**
   * Optional additional information or metadata label.
   * @type {string | undefined}
   * @remarks
   * - Displayed in compact form on the poster card
   * - Examples: release year, remaster notation, curator info
   * - Optional and may be omitted entirely
   * - Smaller font or muted color in UI
   * - Not all items have $note information
   */
  $note?: string

  /**
   * Image source URL or path for the poster thumbnail.
   * @type {string | undefined}
   * @remarks
   * - Can be absolute URL: `https://cdn.example.com/covers/album.jpg`
   * - Can be relative path: `/covers/album.jpg`
   * - Can be relative to app root without leading slash: `covers/album.jpg`
   * - Used as img src attribute: `:src="item.$cover_src"`
   * - Should be accessible (CORS if cross-origin)
   * - If undefined, component renders placeholder/default image
   * - Typically mapped from cover_art or thumb_url field: `$cover_src: album.cover_art`
   * - May include query parameters for CDN transformations
   */
  $cover_src?: string
}
