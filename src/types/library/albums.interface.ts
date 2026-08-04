import type { Artist } from './artist.interface.ts'
import type { PosterItem } from './poster.interface.ts'
import type { Track } from './track.interface.ts'

export interface Album extends PosterItem {
  id: string
  name: string
  release_date?: string
  tracks_count: number
  cover_art: string
  artists: string[]
}
export interface AlbumDetails extends Album {
  tracks: Track[]
}
export interface AlbumResponse {
  player_name: string
  album: AlbumDetails
}
export interface AlbumByArtistResponse {
  artists: Artist[]
  count: number
  player_name: string
  albums: Album[]
}
export interface AlbumsResponse {
  player_name: string
  count: number
  albums: Album[]
}
