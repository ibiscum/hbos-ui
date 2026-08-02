<template>
  <RouterView />
  <SecurityPrompt />
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

import { usePlayerStore } from '@/stores/player'
import { useAudioControls } from '@/stores/audio-controls'
import { usePlayerWebSocket } from '@/stores/player-web-socket'

import SecurityPrompt from '@/components/SecurityPrompt.vue'

const playerStore = usePlayerStore()
const audioControls = useAudioControls()
const playerWebSocket = usePlayerWebSocket()

try {
  playerStore.initPlayer()
} catch (error) {
  console.error('Failed to initialize player:', error)
}

onBeforeUnmount(() => {
  try {
    // Clear progress interval for audio control updates
    if (audioControls?.progressIntervalID) {
      audioControls.stopAutoProgress()
    }

    // Clear polling interval for player state updates
    if (playerStore?.updateIntervalID) {
      playerStore.clearPollingInterval()
    }

    // Disconnect WebSocket and clear reference
    if (playerWebSocket?.wsController) {
      try {
        playerWebSocket.wsController.disconnect()
      } catch (disconnectError) {
        console.error('Error disconnecting WebSocket:', disconnectError)
      }
      playerWebSocket.wsController = null
    }
  } catch (cleanupError) {
    console.error('Error during cleanup:', cleanupError)
  }
})
</script>
