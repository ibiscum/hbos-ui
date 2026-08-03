import { ref } from 'vue'
import { useLibraryFetch } from '@/composables/useLibraryFetch'

interface FavouriteProvider {
  name: string
  display_name?: string
  enabled: boolean
  active: boolean
  favourite_count: number | null
}

interface FavouritesInfo {
  enabled_providers: string[]
  total_providers: number
  enabled_count: number
  providers: FavouriteProvider[]
}

export function useFavouritesInfo() {
  const libraryFetch = useLibraryFetch()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const favouritesInfo = ref<FavouritesInfo | null>(null)

  const formatErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message
    }

    if (typeof err === 'object' && err !== null) {
      return JSON.stringify(err)
    }

    return String(err)
  }

  // Get favourites system information
  const getFavouritesInfo = async () => {
    try {
      loading.value = true
      error.value = null

      const { error: fetchError, data } = await libraryFetch('/favourites/providers').json<FavouritesInfo>()

      if (fetchError.value) {
        const errorMessage = formatErrorMessage(fetchError.value)
        favouritesInfo.value = null
        error.value = `Failed to fetch favourites info: ${errorMessage}`
        return null
      }

      if (data.value) {
        favouritesInfo.value = data.value
        return data.value
      }

      favouritesInfo.value = null
      error.value = 'No data received'
      return null
    } catch (err) {
      favouritesInfo.value = null
      const errorMessage = formatErrorMessage(err)
      error.value = `Failed to fetch favourites info: ${errorMessage}`
      console.error('Error fetching favourites info:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Format provider status for display
  const getProviderStatusText = (provider: FavouriteProvider): string => {
    if (!provider.enabled) {
      return 'Disabled'
    }
    if (!provider.active) {
      return 'Enabled (Inactive)'
    }
    return 'Active'
  }

  // Get provider status class for styling
  const getProviderStatusClass = (provider: FavouriteProvider): string => {
    if (!provider.enabled) {
      return 'status-disabled'
    }
    if (!provider.active) {
      return 'status-inactive'
    }
    return 'status-active'
  }

  return {
    loading,
    error,
    favouritesInfo,
    getFavouritesInfo,
    getProviderStatusText,
    getProviderStatusClass
  }
}
