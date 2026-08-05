import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CAPABILITIES,
  extractPlayerCapabilities,
} from '../extractPlayerCapabilities'
import type { CurrentPlayer, Player } from '@/types/player'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    name: 'mpd',
    id: 'mpd:6600',
    state: 'playing',
    is_active: false,
    has_library: false,
    last_seen: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('extractPlayerCapabilities', () => {
  it('returns default capabilities when payload is missing player', () => {
    expect(extractPlayerCapabilities(undefined as unknown as CurrentPlayer)).toEqual(DEFAULT_CAPABILITIES)
    expect(extractPlayerCapabilities({} as CurrentPlayer)).toEqual(DEFAULT_CAPABILITIES)
  })

  it('prefers metadata capabilities when available', () => {
    const data: CurrentPlayer = {
      player: makePlayer({
        metadata: {
          capabilities: ['play', 'pause', 'stop', 'previous', 'next', 'seek', 'queue', 'random', 'loop'],
        },
        capabilities: ['play'],
      }),
    }

    expect(extractPlayerCapabilities(data)).toEqual({
      canPlay: true,
      canPause: true,
      canStop: true,
      canPrevious: true,
      canNext: true,
      canSeek: true,
      hasQueue: true,
      canShuffle: true,
      canLoop: true,
    })
  })

  it('uses direct player capabilities when metadata capabilities are not present', () => {
    const data: CurrentPlayer = {
      player: makePlayer({
        capabilities: ['play', 'next', 'shuffle'],
      }),
    }

    expect(extractPlayerCapabilities(data)).toEqual({
      canPlay: true,
      canPause: false,
      canStop: false,
      canPrevious: false,
      canNext: true,
      canSeek: false,
      hasQueue: false,
      canShuffle: true,
      canLoop: false,
    })
  })

  it('treats random as shuffle capability in direct player capabilities', () => {
    const data: CurrentPlayer = {
      player: makePlayer({
        capabilities: ['random'],
      }),
    }

    expect(extractPlayerCapabilities(data)).toEqual({
      canPlay: false,
      canPause: false,
      canStop: false,
      canPrevious: false,
      canNext: false,
      canSeek: false,
      hasQueue: false,
      canShuffle: true,
      canLoop: false,
    })
  })

  it('infers capabilities from active player state and optional fields', () => {
    const data: CurrentPlayer = {
      player: makePlayer({
        is_active: true,
        has_library: true,
      }),
      song: {
        title: 'Track',
        artist: 'Artist',
        duration: 180,
      },
      shuffle: false,
      loop_mode: 'playlist',
      position: 12.5,
    }

    expect(extractPlayerCapabilities(data)).toEqual({
      canPlay: true,
      canPause: true,
      canStop: true,
      canPrevious: true,
      canNext: true,
      canSeek: true,
      hasQueue: true,
      canShuffle: true,
      canLoop: true,
    })
  })

  it('only infers basic transport controls for active player without optional hints', () => {
    const data: CurrentPlayer = {
      player: makePlayer({
        is_active: true,
        has_library: false,
      }),
      song: null,
      position: null,
    }

    expect(extractPlayerCapabilities(data)).toEqual({
      canPlay: true,
      canPause: true,
      canStop: true,
      canPrevious: false,
      canNext: false,
      canSeek: false,
      hasQueue: false,
      canShuffle: false,
      canLoop: false,
    })
  })

  it('keeps defaults for inactive players when no explicit capabilities are provided', () => {
    const data: CurrentPlayer = {
      player: makePlayer({
        is_active: false,
      }),
      song: {
        title: 'Track',
        artist: 'Artist',
        duration: 180,
      },
      shuffle: true,
      loop_mode: 'song',
      position: 42,
    }

    expect(extractPlayerCapabilities(data)).toEqual(DEFAULT_CAPABILITIES)
  })
})
