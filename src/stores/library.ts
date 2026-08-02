import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { useFetch } from '@vueuse/core'
import { useToastStore } from '@/stores/toast'

import type { LibraryPlayer, LibraryPlayerResponse } from '@/types/library'

import { useAppConfigStore } from '@/stores/appconfig'
import { getAllLibraryStats, type LibraryStatsResponse } from '@/api/audiocontrol-library'

export const useLibraryStore = defineStore('library', () => {
  const configStore = useAppConfigStore()
  const toastStore = useToastStore()

  // State
  const loading = ref<boolean>(false)
  const activeLibrary = ref<string | null>(null)
  const libraryStats = ref<LibraryStatsResponse[]>([])
  const libraryStatsLoading = ref<boolean>(false)
  const libraryStatsError = ref<string>('')

  // Getters
  const isAvailableLibrary = computed(() => Boolean(activeLibrary.value))
  const isLibraryUpdating = computed(() => !isLibraryLoaded.value && Boolean(activeLibrary.value))

  // State for library loading status
  const isLibraryLoaded = ref<boolean>(false)
  const supportsDelete = ref<boolean>(false)

  // Actions
  const getAvailableLibrary = async () => {
    loading.value = true

    try {
      const apiBase = configStore.getApiBaseUrl()
      const { error, data } = await useFetch<LibraryPlayerResponse>(`${apiBase}/library`).json()

      if (error.value) {
        toastStore.showErrorToast('Could not fetch library.')
        return Promise.reject(error.value)
      }

      const players = data.value?.players ?? []

      // Find any player with library that's loaded
      let availableLibrary = players.find((p: LibraryPlayer) =>
        p.has_library && p.is_loaded
      )

      // Last resort: any player with library
      if (!availableLibrary) {
        availableLibrary = players.find((p: LibraryPlayer) => p.has_library)
      }

      if (availableLibrary) {
        activeLibrary.value = availableLibrary.player_name
        isLibraryLoaded.value = availableLibrary.is_loaded
        supportsDelete.value = availableLibrary.supports_delete ?? false
      } else {
        activeLibrary.value = null
        isLibraryLoaded.value = false
        supportsDelete.value = false
      }

      return Promise.resolve(activeLibrary.value)
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  // Method to refresh library status (useful for checking if library update has completed)
  const refreshLibraryStatus = async () => {
    if (!activeLibrary.value) {
      return
    }

    try {
      const apiBase = configStore.getApiBaseUrl()
      const { error, data } = await useFetch<LibraryPlayerResponse>(`${apiBase}/library`).json()

      if (!error.value && data.value?.players) {
        const currentPlayer = data.value.players.find((p: LibraryPlayer) => p.player_name === activeLibrary.value)
        if (currentPlayer) {
          isLibraryLoaded.value = currentPlayer.is_loaded
        }
      }
    } catch {
      // keep existing state if refresh fails
    }
  }

  const fetchLibraryStats = async () => {
    libraryStatsLoading.value = true
    libraryStatsError.value = ''
    try {
      libraryStats.value = await getAllLibraryStats()
    } catch (err) {
      libraryStatsError.value = err instanceof Error ? err.message : 'Failed to retrieve library statistics'
    } finally {
      libraryStatsLoading.value = false
    }
  }

  const getAlbumCover = (id: string) => {
    if (!activeLibrary.value) {
      return ''
    }
    const apiBase = configStore.getApiBaseUrl()
    return `${apiBase}/library/${activeLibrary.value}/image/album:${id}`
  }

  return {
    // Store
    loading,
    activeLibrary,
    isLibraryLoaded,
    supportsDelete,
    libraryStats,
    libraryStatsLoading,
    libraryStatsError,

    // Getters
    isAvailableLibrary,
    isLibraryUpdating,

    // Actions
    getAvailableLibrary,
    refreshLibraryStatus,
    fetchLibraryStats,
    getAlbumCover,
  }
})
