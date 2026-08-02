import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Artist, ArtistMetadata } from '@/types/library'
import { useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useLibraryStore } from '@/stores/library'
import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { rewriteImageUrl } from '@/api/utils'

export const useArtistStore = defineStore('artist', () => {
  const libraryFetch = useLibraryFetch()
  const toastStore = useToastStore()
  const libraryStore = useLibraryStore()
  const router = useRouter()

  const page = ref<number>(1)
  const hasMore = ref<boolean>(true)

  // State
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  const artists = ref<Artist[]>([])
  const allArtists = ref<Artist[]>([]) // Store all artists
  const artistByName = ref<ArtistMetadata | null>(null)
  const searchQuery = ref<string>('')

  // Getter
  const sortedArtists = computed(() => {
    return [...artists.value].sort((a, b) => a.name.localeCompare(b.name))
  })

  const mapArtistForDisplay = (artist: Artist): Artist => {
    let coverSrc: string | undefined
    if (artist.thumb_url && artist.thumb_url.length > 0) {
      coverSrc = rewriteImageUrl(artist.thumb_url[0])
    }

    return {
      ...artist,
      $id: artist.id,
      $title: artist.name,
      $subtitle: `${artist.album_count} album${artist.album_count !== 1 ? 's' : ''}`,
      $cover_src: coverSrc,
    }
  }

  // Get artist by ID from existing data
  const getArtistByIdFromStore = (id: string) => {
    return allArtists.value.find(artist => artist.$id === id || artist.id === id) || null
  }

  // Filter function that updates the artists array directly
  const filterArtists = (query: string) => {
    if (!query.trim()) {
      // If no query, show all artists
      artists.value = [...allArtists.value]
    } else {
      // Filter artists by name
      const lowerQuery = query.toLowerCase().trim()
      artists.value = allArtists.value.filter(artist =>
        artist.name.toLowerCase().includes(lowerQuery)
      )
    }
  }

  // Action
  const getArtists = async () => {
    loading.value = true
    loaded.value = false

    try {
      // Load all artists at once by using a large limit parameter
      const { error, data, isFinished } = await libraryFetch('/library/:activeLibrary/artists?limit=10000').json()

      if (error.value) {
        toastStore.showErrorToast(`Get Artists Error: ${error.value}`)
      }

      if (data.value?.artists && data.value.artists.length > 0) {
        const mappedArtists = data.value.artists.map((artist: Artist) => mapArtistForDisplay(artist))

        // Store all artists and set the filtered artists
        allArtists.value = mappedArtists
        artists.value = mappedArtists
      } else {
        allArtists.value = []
        artists.value = []
        // No artists found - refresh library status to check if library is still updating
        await libraryStore.refreshLibraryStatus()
      }

      loaded.value = isFinished.value && !error.value
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toastStore.showErrorToast(`Get Artists Error: ${errorMessage}`)
      loaded.value = false
    } finally {
      loading.value = false
    }
  }

  const getMoreArtists = async () => {
    if (!hasMore.value || loading.value) return

    loading.value = true
    loaded.value = false

    try {
      const { error, data, isFinished } = await libraryFetch(
        `/library/:activeLibrary/artists?page=${page.value}`,
      ).json()

      if (error.value) {
        toastStore.showErrorToast(`Get Artists Error: ${error.value}`)
      }

      const newArtists = data.value?.artists?.map((artist: Artist) => mapArtistForDisplay(artist)) || []
      if (newArtists.length) {
        artists.value.push(...newArtists)
        allArtists.value.push(...newArtists)
        page.value++
      } else {
        hasMore.value = false
      }

      loaded.value = isFinished.value && !error.value
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toastStore.showErrorToast(`Get Artists Error: ${errorMessage}`)
      loaded.value = false
    } finally {
      loading.value = false
    }
  }

  const getArtistByName = async (name: string) => {
    loading.value = true
    loaded.value = false

    try {
      const normalizedName = encodeURIComponent(name.toLowerCase())
      const { error, data, isFinished } = await libraryFetch(
        `/library/:activeLibrary/artist/by-name/${normalizedName}`,
      ).json()

      if (error.value) {
        toastStore.showErrorToast(`Get Artists by Name Error: ${error.value}`)
      }

      if (data.value?.artist) {
        artistByName.value = data.value.artist
        router.push({
          name: 'artist-album',
          params: {
            artistId: data.value.artist.id,
          },
        })
      } else {
        artistByName.value = null
      }

      loaded.value = isFinished.value && !error.value
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toastStore.showErrorToast(`Get Artists by Name Error: ${errorMessage}`)
      artistByName.value = null
      loaded.value = false
    } finally {
      loading.value = false
    }
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
    filterArtists(query)
  }

  const clearSearch = () => {
    searchQuery.value = ''
    filterArtists('')
  }

  return {
    // State
    loading,
    loaded,
    artists,
    allArtists,
    artistByName,
    searchQuery,

    // Getter
    sortedArtists,

    // Action
    getArtists,
    getArtistByName,
    getArtistByIdFromStore,
    getMoreArtists,
    setSearchQuery,
    clearSearch,
    filterArtists,
  }
})
