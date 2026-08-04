import { describe, expect, it } from 'vitest'
import type {
  CreatePlayerWebSocketOptions,
  Subscription,
  WsController,
  WsEventType,
  WsPlayerEvent,
  createPlayerWebSocketOptions,
} from '@/types/web-socket'

const createSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  players: ['mpd'],
  event_types: ['state_changed', 'song_changed'],
  ...overrides,
})

const createWsEvent = (overrides: Partial<WsPlayerEvent> = {}): WsPlayerEvent => ({
  player_name: 'mpd',
  type: 'state_changed',
  state: 'playing',
  ...overrides,
})

const createWsController = (): WsController => ({
  connect: () => undefined,
  disconnect: () => undefined,
  getSocket: () => null,
  updateSubscription: () => true,
  subscribe: () => true,
})

const resolveEventType = (event: WsPlayerEvent): WsEventType | undefined => {
  return event.event_type ?? event.type
}

const resolveEventSource = (event: WsPlayerEvent) => {
  if (event.event_type) {
    const source = event.source || {}
    return {
      playerName: source.player_name,
      isActive: source.is_active ?? source.is_active_player,
    }
  }

  return {
    playerName: event.player_name,
    isActive: event.is_active_player,
  }
}

describe('web-socket types', () => {
  describe('unit contract coverage', () => {
    it('models a player-scoped subscription', () => {
      const subscription: Subscription = createSubscription()

      expect(subscription.players).toEqual(['mpd'])
      expect(subscription.event_types).toEqual(['state_changed', 'song_changed'])
    })

    it('models a wildcard/system-wide subscription', () => {
      const subscription: Subscription = createSubscription({
        players: ['*'],
        event_types: ['volume_changed'],
      })

      expect(subscription.players).toEqual(['*'])
      expect(subscription.event_types).toEqual(['volume_changed'])
    })

    it('supports null subscription fields for fallback semantics', () => {
      const subscription: Subscription = createSubscription({
        players: null,
        event_types: null,
      })

      expect(subscription.players).toBeNull()
      expect(subscription.event_types).toBeNull()
    })

    it('supports both event field variants used by store routing', () => {
      const byType = createWsEvent({ type: 'song_changed' })
      const byEventType = createWsEvent({
        type: undefined,
        event_type: 'state_changed',
        source: { player_name: 'mpd', is_active: true },
      })

      expect(resolveEventType(byType)).toBe('song_changed')
      expect(resolveEventType(byEventType)).toBe('state_changed')
    })

    it('models typed player state and loop mode values', () => {
      const event: WsPlayerEvent = createWsEvent({
        state: 'paused',
        mode: 'Track',
        loop_mode: 'playlist',
      })

      expect(event.state).toBe('paused')
      expect(event.mode).toBe('Track')
      expect(event.loop_mode).toBe('playlist')
    })

    it('allows partial metadata updates from websocket payloads', () => {
      const eventWithTitleOnly: WsPlayerEvent = createWsEvent({
        type: 'metadata_changed',
        metadata: { title: 'Track Name' },
      })

      const eventWithArtworkOnly: WsPlayerEvent = createWsEvent({
        type: 'metadata_changed',
        metadata: { artwork_url: 'https://example.com/artwork.jpg' },
      })

      expect(eventWithTitleOnly.metadata?.title).toBe('Track Name')
      expect(eventWithTitleOnly.metadata?.artist).toBeUndefined()
      expect(eventWithArtworkOnly.metadata?.artwork_url).toContain('artwork.jpg')
    })

    it('supports position payload as number, string, or structured object', () => {
      const numericPosition: WsPlayerEvent = createWsEvent({ position: 45.5 })
      const stringPosition: WsPlayerEvent = createWsEvent({ position: '45.5' })
      const objectPosition: WsPlayerEvent = createWsEvent({
        position: { position: '45.5', duration: 180 },
      })

      expect(numericPosition.position).toBe(45.5)
      expect(stringPosition.position).toBe('45.5')
      if (typeof objectPosition.position === 'object') {
        expect(objectPosition.position.position).toBe('45.5')
        expect(objectPosition.position.duration).toBe(180)
      }
    })

    it('keeps WsController method signatures consistent', () => {
      const controller = createWsController()

      expect(controller.subscribe('mpd', ['state_changed'])).toBe(true)
      expect(controller.updateSubscription(createSubscription())).toBe(true)
      expect(controller.getSocket()).toBeNull()
    })

    it('keeps options type alias compatible with current usages', () => {
      const nextNameOptions: CreatePlayerWebSocketOptions = {
        protocol: 'ws:',
        hostname: 'localhost',
        port: 3000,
        apiPrefix: '/api',
        onConnect: () => undefined,
        onDisconnect: () => undefined,
        onMessage: () => undefined,
        onError: () => undefined,
      }

      const legacyAliasOptions: createPlayerWebSocketOptions = nextNameOptions

      expect(legacyAliasOptions.hostname).toBe('localhost')
      expect(legacyAliasOptions.port).toBe(3000)
    })
  })

  describe('regression coverage for routing assumptions', () => {
    it('supports source-less event_type payloads without runtime access errors', () => {
      const event = createWsEvent({
        player_name: 'unused',
        type: undefined,
        event_type: 'state_changed',
      })

      const resolved = resolveEventSource(event)
      expect(resolved.playerName).toBeUndefined()
      expect(resolved.isActive).toBeUndefined()
    })

    it('supports active-player resolution in event_type format', () => {
      const event = createWsEvent({
        type: undefined,
        event_type: 'song_changed',
        source: {
          player_name: 'mpd',
          is_active_player: true,
        },
      })

      const resolved = resolveEventSource(event)
      expect(resolved.playerName).toBe('mpd')
      expect(resolved.isActive).toBe(true)
    })

    it('supports top-level active-player flags in type format', () => {
      const event = createWsEvent({
        type: 'state_changed',
        is_active_player: false,
      })

      const resolved = resolveEventSource(event)
      expect(resolved.playerName).toBe('mpd')
      expect(resolved.isActive).toBe(false)
    })

    it('includes event names used by store subscriptions and routing', () => {
      const subscriptionEventTypes: WsEventType[] = [
        'state_changed',
        'song_changed',
        'position_changed',
        'loop_mode_changed',
        'shuffle_changed',
        'capabilities_changed',
        'metadata_changed',
        'song_information_update',
        'volume_changed',
      ]

      expect(subscriptionEventTypes).toContain('volume_changed')
      expect(subscriptionEventTypes).toContain('metadata_changed')
      expect(subscriptionEventTypes).toHaveLength(9)
    })
  })
})
