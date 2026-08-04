import { createFetch } from '@vueuse/core'
import { useLibraryStore } from '@/stores/library'

import { useAppConfigStore } from '@/stores/appconfig'

export const useLibraryFetch = () => {
  const configStore = useAppConfigStore()
  const libraryStore = useLibraryStore()
  return createFetch({
    baseUrl: configStore.getApiBaseUrl(),
    combination: 'overwrite',
    options: {
      async beforeFetch({ url, options, cancel }) {
        try {
          if (!libraryStore.isAvailableLibrary) {
            await libraryStore.getAvailableLibrary()
          }
        } catch (error) {
          console.error('Active library resolution failed:', error)
          cancel()
          return { options, url }
        }

        if (!libraryStore.activeLibrary) {
          console.error('Active library is not available for request URL replacement')
          cancel()
          return { options, url }
        }

        url = url.replace(/:activeLibrary(\/|\?|$)/gi, `${libraryStore.activeLibrary}$1`)
        return { options, url }
      },
    },
  })
}
