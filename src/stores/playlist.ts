import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { useToastStore } from '@/stores/toast'

import type { Track } from '@/types/library'

interface QueueResponse {
  queue?: Track[]
}

export const usePlaylistStore = defineStore('playlist', () => {
  const libraryFetch = useLibraryFetch()
  const toastStore = useToastStore()

  // State
  const loading = ref<boolean>(false)
  const queue = ref<Track[]>([])

  // Actions
  const fetchQueue = async () => {
    loading.value = true

    try {
      const { error, data } = await libraryFetch<QueueResponse>(`/player/:activeLibrary/queue`)
        .get()
        .json()

      if (error.value) {
        toastStore.showErrorToast(`Queue fetch error: ${error.value}`)
        queue.value = []
      } else if (Array.isArray(data.value?.queue)) {
        queue.value = [...data.value.queue]
      } else if (data.value?.queue !== undefined) {
        toastStore.showErrorToast('Queue fetch error: Invalid queue response')
        queue.value = []
      } else {
        queue.value = []
      }
    } catch {
      toastStore.showErrorToast('Failed to fetch playlist')
      queue.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    queue,

    // Actions
    fetchQueue,
  }
})
