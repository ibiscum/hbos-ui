<template>
  <div class="app-progress-control">
    <ProgressTime
      v-if="!isOnHeader"
      :seek-position-time="audioControls.seekPositionTime"
      :song-duration-time="audioControls.songDurationTime"
    />

    <ProgressSlider
      :value="audioControls.seekPosition"
      :disabled="isSendingCommand || !caps.canSeek"
      :min="min"
      :max="max"
      :step="step"
      :has-thumb="hasThumb"
      :is-draggable="isDraggable"
      :is-on-header="isOnHeader"
      @click:progress="handleSeek"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAudioControls } from '@/stores/audio-controls'

import ProgressSlider from '@/components/ProgressSlider.vue'
import ProgressTime from '@/components/ProgressTime.vue'

interface ProgressControlProps {
  min?: number
  max?: number
  step?: number
  hasThumb?: boolean
  isDraggable?: boolean
  isOnHeader?: boolean
}

const {
  min = 0,
  max = 100,
  step = 1,
  hasThumb = true,
  isDraggable = false,
  isOnHeader = false,
} = defineProps<ProgressControlProps>()

const { isSendingCommand, playerCapabilities: caps } = storeToRefs(usePlayerStore())
const audioControls = useAudioControls()

function handleSeek(position: number) {
  if (isSendingCommand.value || !caps.value.canSeek) {
    return
  }

  audioControls.seekToPosition(position)
}
</script>

<style lang="scss">
.app-progress-control {
  width: 100%;
}
</style>
