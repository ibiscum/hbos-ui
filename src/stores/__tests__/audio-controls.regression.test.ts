import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

const mockSendCommand = vi.fn()
const mockFetchCurrentPlayer = vi.fn()
const mockPauseAllPlayers = vi.fn()

const currentDataRef = ref<{ state?: string; shuffle?: boolean; song?: { duration?: number }; loop_mode?: string } | null>({
  state: 'paused',
  shuffle: false,
  song: { duration: 200 },
  loop_mode: 'none',
})
const currentSongRef = ref<{ duration?: number } | null>({ duration: 200 })
const currentPositionRef = ref(0)

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      currentData: currentDataRef,
      currentSong: currentSongRef,
    }),
  }
})

vi.mock('@/stores/player', () => ({
  usePlayerStore: () => ({
    sendCommand: mockSendCommand,
    fetchCurrentPlayer: mockFetchCurrentPlayer,
    currentData: currentDataRef,
    currentSong: currentSongRef,
  }),
}))

vi.mock('@/composables/usePlayerPosition', () => ({
  usePlayerPosition: () => ({
    position: currentPositionRef,
  }),
}))

vi.mock('@/api/player', () => ({
  pauseAllPlayers: () => mockPauseAllPlayers(),
}))

import { useAudioControls } from '../audio-controls'

describe('Audio Controls Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    currentDataRef.value = { state: 'paused', shuffle: false, song: { duration: 200 }, loop_mode: 'none' }
    currentSongRef.value = { duration: 200 }
    currentPositionRef.value = 0
  })

  it('computes seek position percentage from current position and duration', () => {
    const store = useAudioControls()
    currentPositionRef.value = 50
    expect(store.seekPosition).toBe(25)
  })

  it('togglePlayPause pauses all players when currently playing', async () => {
    currentDataRef.value = { state: 'playing', shuffle: false, song: { duration: 200 }, loop_mode: 'none' }
    const store = useAudioControls()

    await store.togglePlayPause()

    expect(mockPauseAllPlayers).toHaveBeenCalledTimes(1)
  })

  it('togglePlayPause sends play command when not playing', async () => {
    currentDataRef.value = { state: 'paused', shuffle: false, song: { duration: 200 }, loop_mode: 'none' }
    const store = useAudioControls()

    await store.togglePlayPause()

    expect(mockSendCommand).toHaveBeenCalledWith('play')
  })

  it('cycleLoopMode rotates none -> track -> playlist -> none', async () => {
    const store = useAudioControls()

    currentDataRef.value = { ...currentDataRef.value, loop_mode: 'none' }
    await store.cycleLoopMode()
    expect(mockSendCommand).toHaveBeenCalledWith('set_loop:track')

    currentDataRef.value = { ...currentDataRef.value, loop_mode: 'track' }
    await store.cycleLoopMode()
    expect(mockSendCommand).toHaveBeenCalledWith('set_loop:playlist')

    currentDataRef.value = { ...currentDataRef.value, loop_mode: 'playlist' }
    await store.cycleLoopMode()
    expect(mockSendCommand).toHaveBeenCalledWith('set_loop:none')
  })

  it('seekToPosition clamps values over 100% to song duration', () => {
    const store = useAudioControls()

    store.seekToPosition(120)

    expect(mockSendCommand).toHaveBeenCalledWith('seek:200')
  })

  it('seekToPosition clamps negative values to 0', () => {
    const store = useAudioControls()

    store.seekToPosition(-10)

    expect(mockSendCommand).toHaveBeenCalledWith('seek:0')
  })

  it('playNextOrPrev ignores invalid commands', () => {
    const store = useAudioControls()

    store.playNextOrPrev('invalid-command')

    expect(mockSendCommand).not.toHaveBeenCalledWith('invalid-command')
  })
})
