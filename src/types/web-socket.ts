import type { LoopMode, PlayerCapability, PlayerState, Song } from '@/types/player'

export type WsEventType =
  | 'state_changed'
  | 'song_changed'
  | 'position_changed'
  | 'loop_mode_changed'
  | 'shuffle_changed'
  | 'random_changed'
  | 'queue_changed'
  | 'capabilities_changed'
  | 'metadata_changed'
  | 'song_information_update'
  | 'volume_changed'
  | 'welcome'
  | 'subscription_updated'

export interface WsEventMetadata {
  title?: string
  artist?: string
  album?: string
  artwork_url?: string
  song?: Song
}

export interface WsEventPosition {
  position: number | string
  duration?: number | string
}

export interface WsEventSource {
  player_id?: string
  player_name?: string
  is_active?: boolean
  is_active_player?: boolean
}

export interface Subscription {
  players: string[] | null
  event_types: string[] | null
}

export interface WsController {
  connect: () => void
  disconnect: () => void
  getSocket: () => WebSocket | null
  updateSubscription: (subscription: Subscription) => boolean
  subscribe: (playerName: string, eventTypes: string[]) => boolean
}

export interface WsPlayerEvent {
  player_name: string // 'mpd'
  player_id?: string // 'mpd:6600'
  is_active?: boolean // true | false
  is_active_player?: boolean // true | false
  type?: WsEventType
  event_type?: WsEventType
  state?: PlayerState
  metadata?: WsEventMetadata
  capabilities?: PlayerCapability[]
  shuffle?: boolean // true | false
  enabled?: boolean // true | false
  mode?: LoopMode // LoopModeLowercase | "No" | "None" | "Song" | "Track" | "Playlist"
  loop_mode?: LoopMode // LoopModeLowercase | "No" | "None" | "Song" | "Track" | "Playlist"
  song?: Song
  percentage?: number // 75
  position?: WsEventPosition | number | string
  source?: WsEventSource
}

export interface CreatePlayerWebSocketOptions {
  protocol?: string
  hostname?: string
  port?: string | number
  apiPrefix?: string
  onConnect: () => void
  onDisconnect: (event: Event) => void
  onMessage: (data: WsPlayerEvent) => void
  onError: (error: Event) => void
}

// Backward-compatibility alias for existing imports.
export type createPlayerWebSocketOptions = CreatePlayerWebSocketOptions
