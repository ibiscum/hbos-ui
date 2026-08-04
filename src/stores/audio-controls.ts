import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { usePlayerPosition } from '@/composables/usePlayerPosition'
import { pauseAllPlayers } from '@/api/player'

import { formatTime } from '@/helpers/formatTime'

import type { LoopMode } from '@/types/player'

const PLAYBACK_SKIP_COMMANDS = ['next', 'previous'] as const
type PlaybackSkipCommand = (typeof PLAYBACK_SKIP_COMMANDS)[number]

function isPlaybackSkipCommand(value: string): value is PlaybackSkipCommand {
  return PLAYBACK_SKIP_COMMANDS.includes(value as PlaybackSkipCommand)
}

function isLoopMode(value: string): value is Exclude<LoopMode, undefined> {
  return ['no', 'none', 'song', 'track', 'playlist'].includes(value)
}

export const useAudioControls = defineStore('audio-controls', () => {
  const playerStore = usePlayerStore()
  const { fetchCurrentPlayer, sendCommand } = playerStore
  const { currentData, currentSong } = storeToRefs(playerStore)

  // Use the shared player position composable
  const { position: currentPosition } = usePlayerPosition()

  // State
  const progressIntervalID = ref<ReturnType<typeof setInterval> | undefined>(undefined)

  const getSongDuration = () => currentSong.value?.duration ?? currentData.value?.song?.duration

  // Computed seek position as percentage
  const seekPosition = computed(() => {
    if (!currentSong.value?.duration) return 0
    return (currentPosition.value / currentSong.value.duration) * 100
  })

  // Getters
  const isPlaying = computed(() => currentData.value?.state === 'playing')
  const isPaused = computed(() => currentData.value?.state === 'paused')
  const isPlayingOrPaused = computed(() => isPlaying.value || isPaused.value) // not used as we don't have Stop button

  const isShuffle = computed(() => currentData.value?.shuffle)

  // Check the loop mode value case-insensitively since API might use different cases
  const currentLoopMode = computed(() => {
    const mode = (currentData.value?.loop_mode || 'none').toLowerCase()

    return isLoopMode(mode) ? mode : 'none'
  })

  const isCurrentLoopModeNone = computed(
    () => currentLoopMode.value === 'none' || currentLoopMode.value === 'no',
  )
  const isCurrentLoopModeTrack = computed(
    () => currentLoopMode.value === 'track' || currentLoopMode.value === 'song',
  )
  const isCurrentLoopModePlaylist = computed(() => currentLoopMode.value === 'playlist')

  // Backward-compatible aliases kept for existing component bindings.
  const iscurrentLoopModeNone = isCurrentLoopModeNone
  const iscurrentLoopModeTrack = isCurrentLoopModeTrack
  const iscurrentLoopModePlaylist = isCurrentLoopModePlaylist

  const songDurationTime = computed(() => formatTime(currentSong.value?.duration))
  const seekPositionTime = computed(() =>
    formatTime(((currentSong.value?.duration || 0) * (seekPosition.value || 0)) / 100),
  )

  // Start/stop the position update interval based on play state
  watch(
    () => currentData.value?.state,
    (newState) => {
      if (newState === 'playing' && progressIntervalID.value == null) {
        startAutoProgress()
      } else if (newState !== 'playing' && progressIntervalID.value != null) {
        stopAutoProgress()
      }
    },
    { immediate: true },
  )

  // Actions
  const togglePlayPause = async () => {
    stopAutoProgress()

    if (isPlaying.value) {
      // When pausing, pause all players
      try {
        await pauseAllPlayers()
      } catch (error) {
        console.error('Failed to pause all players, falling back to single player pause:', error)
        // Fallback to single player command if pause-all fails
        sendCommand('pause')
      }
    } else {
      // When playing, send play command to active player
      sendCommand('play')
    }
  }

  const playNextOrPrev = (nextOrPrev: string) => {
    if (!isPlaybackSkipCommand(nextOrPrev)) {
      return
    }

    // Playback commands go to active player
    sendCommand(nextOrPrev)
  }

  const toggleShuffle = () => {
    if (isShuffle.value !== undefined) {
      // can be undefined if can't Shuffle
      // Playback state commands go to active player
      sendCommand(`set_random:${!isShuffle.value}`)
    }
  }

  function cycleLoopMode() {
    if (!currentData.value) return

    let nextMode: string | undefined

    switch (currentLoopMode.value) {
      case 'none':
      case 'no':
        nextMode = 'track'
        break
      case 'track':
      case 'song':
        nextMode = 'playlist'
        break
      case 'playlist':
      default:
        nextMode = 'none'
        break
    }

    // Playback state commands go to active player
    sendCommand(`set_loop:${nextMode}`)
  }

  /**
   * Send a seek command to the player
   * @param {number} position - The position to seek to in seconds
   * @returns {void} Success or failure
   */
  function seekToPosition(position: number): void {
    try {
      stopAutoProgress()

      const duration = getSongDuration()

      if (!duration) {
        console.error('Error seeking to position: No Song duration')

        return
      }

      const normalizedPosition = Math.max(0, Math.min(100, position))
      const seekToPosition = (duration * normalizedPosition) / 100

      const seekCommand = `seek:${Math.floor(seekToPosition)}`

      // Seek commands go to active player
      sendCommand(seekCommand)
      sendCommand('play')
    } catch (error) {
      stopAutoProgress()

      console.error('Error seeking to position:', error)
    }
  }

  function startAutoProgress() {
    stopAutoProgress()

    if (isPlaying.value && getSongDuration()) {
      progressIntervalID.value = setInterval(() => {
        // Check if we've reached the end (composable handles position updates automatically)
        if (seekPosition.value >= 100) {
          stopAutoProgress()
          fetchCurrentPlayer()
        }
      }, 500) // 500ms interval to check for track end
    } else {
      stopAutoProgress()
    }
  }

  function stopAutoProgress() {
    if (progressIntervalID.value != null) {
      clearInterval(progressIntervalID.value)
      progressIntervalID.value = undefined
    }
  }

  return {
    // State
    seekPosition,
    progressIntervalID,
    // Getters
    isPlaying,
    isPaused,
    isPlayingOrPaused,
    isShuffle,
    currentLoopMode,
    isCurrentLoopModeNone,
    isCurrentLoopModeTrack,
    isCurrentLoopModePlaylist,
    iscurrentLoopModeNone,
    iscurrentLoopModeTrack,
    iscurrentLoopModePlaylist,
    songDurationTime,
    seekPositionTime,
    // Actions
    togglePlayPause,
    playNextOrPrev,
    toggleShuffle,
    cycleLoopMode,
    seekToPosition,
    startAutoProgress,
    stopAutoProgress,
  }
})
