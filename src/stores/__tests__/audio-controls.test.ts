import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

const mockSendCommand = vi.fn()
const mockFetchCurrentPlayer = vi.fn()
const mockPauseAllPlayers = vi.fn()

const currentDataRef = ref<{
  state?: string
  shuffle?: boolean
  song?: { duration?: number }
  loop_mode?: string
} | null>({
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

describe('audio-controls store - unit and regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    currentDataRef.value = { state: 'paused', shuffle: false, song: { duration: 200 }, loop_mode: 'none' }
    currentSongRef.value = { duration: 200 }
    currentPositionRef.value = 0
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('unit: computed state', () => {
    it('computes seek position from current position and duration', () => {
      const store = useAudioControls()
      currentPositionRef.value = 50
      expect(store.seekPosition).toBe(25)
    })

    it('normalizes loop_mode case and preserves backward-compatible getters', () => {
      const store = useAudioControls()
      currentDataRef.value = { ...currentDataRef.value, loop_mode: 'SONG' }

      expect(store.currentLoopMode).toBe('song')
      expect(store.isCurrentLoopModeTrack).toBe(true)
      expect(store.isCurrentLoopModePlaylist).toBe(false)
      expect(store.isCurrentLoopModeNone).toBe(false)
      expect(store.iscurrentLoopModeTrack).toBe(true)
      expect(store.iscurrentLoopModePlaylist).toBe(false)
      expect(store.iscurrentLoopModeNone).toBe(false)
    })
  })

  describe('unit: command actions', () => {
    it('togglePlayPause pauses all players when currently playing', async () => {
      currentDataRef.value = { state: 'playing', shuffle: false, song: { duration: 200 }, loop_mode: 'none' }
      const store = useAudioControls()

      await store.togglePlayPause()

      expect(mockPauseAllPlayers).toHaveBeenCalledTimes(1)
      expect(mockSendCommand).not.toHaveBeenCalledWith('pause')
    })

    it('togglePlayPause falls back to pause command when pauseAllPlayers fails (regression)', async () => {
      currentDataRef.value = { state: 'playing', shuffle: false, song: { duration: 200 }, loop_mode: 'none' }
      mockPauseAllPlayers.mockRejectedValueOnce(new Error('pause-all failed'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const store = useAudioControls()

      await store.togglePlayPause()

      expect(mockSendCommand).toHaveBeenCalledWith('pause')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to pause all players, falling back to single player pause:',
        expect.any(Error),
      )
    })

    it('togglePlayPause sends play command when not playing', async () => {
      currentDataRef.value = { state: 'paused', shuffle: false, song: { duration: 200 }, loop_mode: 'none' }
      const store = useAudioControls()

      await store.togglePlayPause()

      expect(mockSendCommand).toHaveBeenCalledWith('play')
    })

    it('toggleShuffle sends toggled state only when shuffle capability is defined', () => {
      const store = useAudioControls()

      currentDataRef.value = { ...currentDataRef.value, shuffle: false }
      store.toggleShuffle()
      expect(mockSendCommand).toHaveBeenCalledWith('set_random:true')

      vi.clearAllMocks()
      currentDataRef.value = { ...currentDataRef.value, shuffle: undefined }
      store.toggleShuffle()
      expect(mockSendCommand).not.toHaveBeenCalled()
    })

    it('playNextOrPrev only forwards valid commands', () => {
      const store = useAudioControls()

      store.playNextOrPrev('next')
      store.playNextOrPrev('previous')
      store.playNextOrPrev('invalid-command')

      expect(mockSendCommand).toHaveBeenCalledWith('next')
      expect(mockSendCommand).toHaveBeenCalledWith('previous')
      expect(mockSendCommand).not.toHaveBeenCalledWith('invalid-command')
    })

    it('cycleLoopMode rotates none -> track -> playlist -> none', () => {
      const store = useAudioControls()

      currentDataRef.value = { ...currentDataRef.value, loop_mode: 'none' }
      store.cycleLoopMode()
      expect(mockSendCommand).toHaveBeenCalledWith('set_loop:track')

      currentDataRef.value = { ...currentDataRef.value, loop_mode: 'track' }
      store.cycleLoopMode()
      expect(mockSendCommand).toHaveBeenCalledWith('set_loop:playlist')

      currentDataRef.value = { ...currentDataRef.value, loop_mode: 'playlist' }
      store.cycleLoopMode()
      expect(mockSendCommand).toHaveBeenCalledWith('set_loop:none')
    })
  })

  describe('regression: seek and progress interval behavior', () => {
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

    it('seekToPosition falls back to currentSong duration when currentData song is missing', () => {
      const store = useAudioControls()
      currentDataRef.value = { state: 'paused', shuffle: false, loop_mode: 'none' }
      currentSongRef.value = { duration: 180 }

      store.seekToPosition(50)

      expect(mockSendCommand).toHaveBeenCalledWith('seek:90')
      expect(mockSendCommand).toHaveBeenCalledWith('play')
    })

    it('seekToPosition does nothing when no duration is available', () => {
      const store = useAudioControls()
      currentDataRef.value = { state: 'paused', shuffle: false, song: {}, loop_mode: 'none' }
      currentSongRef.value = null
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      store.seekToPosition(50)

      expect(mockSendCommand).not.toHaveBeenCalledWith(expect.stringMatching(/^seek:/))
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error seeking to position: No Song duration')
    })

    it('startAutoProgress fetches current player when position reaches end', async () => {
      currentDataRef.value = { state: 'playing', shuffle: false, song: { duration: 200 }, loop_mode: 'none' }
      currentSongRef.value = { duration: 200 }
      currentPositionRef.value = 200
      const store = useAudioControls()
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      const callbacks: Array<() => void> = []
      const setIntervalSpy = vi
        .spyOn(globalThis, 'setInterval')
        .mockImplementation(((callback: TimerHandler) => {
          callbacks.push(callback as () => void)
          return 1 as unknown as ReturnType<typeof setInterval>
        }) as unknown as typeof setInterval)

      store.startAutoProgress()
      expect(store.progressIntervalID).toBeDefined()
      expect(setIntervalSpy).toHaveBeenCalledTimes(1)

      callbacks[0]()

      expect(mockFetchCurrentPlayer).toHaveBeenCalledTimes(1)
      expect(clearIntervalSpy).toHaveBeenCalledWith(1)
      expect(store.progressIntervalID).toBeUndefined()
    })

    it('stopAutoProgress clears interval even when interval id is 0 (regression)', () => {
      const store = useAudioControls()
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

      store.progressIntervalID = 0 as unknown as ReturnType<typeof setInterval>
      store.stopAutoProgress()

      expect(clearIntervalSpy).toHaveBeenCalledWith(0)
      expect(store.progressIntervalID).toBeUndefined()
    })
  })
})
