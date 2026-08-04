import { describe, expect, it } from 'vitest'
import type {
  Capabilities,
  CurrentPlayer,
  LoopMode,
  Player,
  PlayerCapability,
  PlayerMetadata,
  PlayerState,
  Song,
  SongMetadata,
  StreamDetails,
} from '@/types/player'

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  name: 'mpd',
  id: 'mpd:6600',
  state: 'stopped',
  is_active: true,
  has_library: true,
  last_seen: '2025-06-25T10:55:42.462145804+00:00',
  ...overrides,
})

const createSong = (overrides: Partial<Song> = {}): Song => ({
  title: 'November',
  artist: 'Limujii',
  duration: 167,
  ...overrides,
})

const createCurrentPlayer = (overrides: Partial<CurrentPlayer> = {}): CurrentPlayer => ({
  player: createPlayer(),
  song: createSong(),
  state: 'playing',
  loop_mode: 'none',
  position: 9.561,
  volume: 45,
  ...overrides,
})

const normalizeLoopMode = (mode?: LoopMode): LoopMode => {
  const normalized = (mode || 'none').toLowerCase()
  return ['no', 'none', 'song', 'track', 'playlist'].includes(normalized)
    ? (normalized as LoopMode)
    : 'none'
}

const resolvePlayerCapabilities = (player: Player): PlayerCapability[] => {
  return player.metadata?.capabilities ?? player.capabilities ?? []
}

describe('player types', () => {
  describe('unit contract coverage', () => {
    it('models required Player fields with a known player state', () => {
      const player: Player = createPlayer({ state: 'paused' })

      expect(player.name).toBe('mpd')
      expect(player.id).toBe('mpd:6600')
      expect(player.state).toBe('paused')
      expect(player.is_active).toBe(true)
      expect(player.has_library).toBe(true)
      expect(player.last_seen).toContain('2025-06-25')
    })

    it('supports known player states used by stores', () => {
      const states: PlayerState[] = ['stopped', 'playing', 'paused']

      states.forEach((state) => {
        const player: Player = createPlayer({ state })
        expect(player.state).toBe(state)
      })
    })

    it('supports capability arrays in metadata and top-level fields', () => {
      const metadataCaps: PlayerMetadata = {
        capabilities: ['play', 'pause', 'seek', 'random', 'loop'],
      }

      const playerWithMetadataCaps: Player = createPlayer({ metadata: metadataCaps })
      const playerWithDirectCaps: Player = createPlayer({ capabilities: ['play', 'queue'] })

      expect(playerWithMetadataCaps.metadata?.capabilities).toContain('random')
      expect(playerWithDirectCaps.capabilities).toEqual(['play', 'queue'])
    })

    it('models SongMetadata duration as number or string for API compatibility', () => {
      const numericDurationMetadata: SongMetadata = {
        lyrics_metadata: { duration: 167 },
      }
      const stringDurationMetadata: SongMetadata = {
        lyrics_metadata: { duration: '167.4' },
      }

      expect(typeof numericDurationMetadata.lyrics_metadata?.duration).toBe('number')
      expect(typeof stringDurationMetadata.lyrics_metadata?.duration).toBe('string')
    })

    it('keeps CurrentPlayer shuffle optional while preserving boolean values', () => {
      const withoutShuffle: CurrentPlayer = createCurrentPlayer()
      const withShuffle: CurrentPlayer = createCurrentPlayer({ shuffle: true })

      expect(withoutShuffle.shuffle).toBeUndefined()
      expect(withShuffle.shuffle).toBe(true)
    })

    it('allows nullable now-playing payload fields', () => {
      const streamDetails: StreamDetails = {
        sample_rate: 44100,
        bits_per_sample: 16,
        channels: 2,
        codec: 'FLAC',
      }

      const current: CurrentPlayer = createCurrentPlayer({
        song: null,
        stream_details: streamDetails,
      })

      expect(current.song).toBeNull()
      expect(current.stream_details?.codec).toBe('FLAC')
    })

    it('matches Capabilities shape used by the player store', () => {
      const capabilities: Capabilities = {
        canPlay: true,
        canPause: true,
        canStop: true,
        canPrevious: false,
        canNext: false,
        canSeek: true,
        hasQueue: true,
        canShuffle: true,
        canLoop: true,
      }

      expect(capabilities.canPlay).toBe(true)
      expect(capabilities.hasQueue).toBe(true)
      expect(capabilities.canNext).toBe(false)
    })
  })

  describe('regression coverage for consumer expectations', () => {
    it('preserves loop-mode normalization behavior used by audio controls', () => {
      const values: LoopMode[] = ['none', 'None', 'song', 'Track', 'Playlist', 'no']

      const normalized = values.map((value) => normalizeLoopMode(value))

      expect(normalized).toEqual(['none', 'none', 'song', 'track', 'playlist', 'no'])
    })

    it('resolves capabilities from metadata first, then from top-level field', () => {
      const playerUsingMetadata = createPlayer({
        metadata: { capabilities: ['play', 'pause'] },
        capabilities: ['stop'],
      })
      const playerUsingDirectCaps = createPlayer({ capabilities: ['seek', 'queue'] })
      const playerWithoutCaps = createPlayer()

      expect(resolvePlayerCapabilities(playerUsingMetadata)).toEqual(['play', 'pause'])
      expect(resolvePlayerCapabilities(playerUsingDirectCaps)).toEqual(['seek', 'queue'])
      expect(resolvePlayerCapabilities(playerWithoutCaps)).toEqual([])
    })

    it('allows defensive optional chaining used by store consumers', () => {
      const undefinedCurrent = undefined as CurrentPlayer | undefined
      const nullCurrent = null as CurrentPlayer | null

      const stateFromUndefined = undefinedCurrent?.state ?? 'stopped'
      const stateFromNull = nullCurrent?.state ?? 'stopped'
      const volumeFromUndefined = undefinedCurrent?.volume ?? 50

      expect(stateFromUndefined).toBe('stopped')
      expect(stateFromNull).toBe('stopped')
      expect(volumeFromUndefined).toBe(50)
    })
  })
})
