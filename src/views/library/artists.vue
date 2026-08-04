<template>
  <PageContent title="Artists" :backrouterLink="{ name: 'library' }">
    <div class="artists">
      <div class="breadcrumbs">
        <div class="search-bar">
          <CustomSearchField
            v-model="search"
            :debounce="300"
            placeholder="Search artists..."
            @change="onSearch"
          />
        </div>
      </div>

      <div class="card">
        <PosterGrid
          :loading="loading"
          :loaded="loaded"
          :items="sortedArtists"
          :show-all="true"
          poster-form="circle"
          @click="handleArtistClick"
        />
      </div>

      <!-- Alphabet Index -->
      <AlphabetIndex
        :items="sortedArtists"
        @letter-click="scrollToLetter"
      />
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

import PageContent from '@/components/PageContent.vue'
import CustomSearchField from '@/components/CustomSearchField.vue'
import PosterGrid from '@/components/PosterGrid.vue'
import AlphabetIndex from '@/components/AlphabetIndex.vue'

import { storeToRefs } from 'pinia'

import { useArtistStore } from '@/stores/artist.ts'
const artistStore = useArtistStore()
const { loading, loaded, sortedArtists } = storeToRefs(artistStore)
const { getArtists, setSearchQuery, clearSearch } = artistStore

const search = ref<string>('')

type ArtistListItem = {
  id?: string
  $id?: string
  name: string
}

const findPosterElement = (artist: ArtistListItem): HTMLElement | null => {
  const dataId = artist.$id || artist.id
  if (!dataId) {
    return null
  }

  const wrapperElement = document.querySelector(`[data-id="${dataId}"]`) as HTMLElement | null
  if (!wrapperElement) {
    return null
  }

  return (
    (wrapperElement.querySelector('.app-poster') as HTMLElement | null) ||
    (wrapperElement.querySelector('[class*="poster"]') as HTMLElement | null) ||
    wrapperElement
  )
}

const scrollToArtist = (artist: ArtistListItem): boolean => {
  const targetElement = findPosterElement(artist)

  if (!targetElement) {
    return false
  }

  targetElement.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
  })

  return true
}

const handleArtistClick = (artist: ArtistListItem) => {
  const artistId = artist.id || artist.$id
  if (!artistId) {
    return
  }

  router.push({ name: 'artist-album', params: { artistId } })
}

const onSearch = (searchValue: string) => {
  search.value = searchValue
  setSearchQuery(searchValue)
}

const scrollToLetter = (letter: string) => {
  if (letter === '#') {
    // Handle scrolling to artists starting with numbers
    const targetArtist = sortedArtists.value.find(artist => {
      const firstChar = artist.name.charAt(0)
      return /[0-9]/.test(firstChar)
    })

    if (targetArtist) {
      if (scrollToArtist(targetArtist)) {
        return
      }
    }

    // If no artists with numbers, or target element was not found, scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
    return
  }

  // Find the first artist that starts with this letter
  const targetArtist = sortedArtists.value.find(artist =>
    artist.name.charAt(0).toUpperCase() === letter
  )

  if (targetArtist) {
    scrollToArtist(targetArtist)
  }
}

onMounted(() => {
  getArtists()
  // Clear any existing search when component mounts
  clearSearch()
  search.value = ''
})
</script>

<style scoped lang="scss">
.artists {
  .breadcrumbs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .search-bar {
      max-width: 200px;
    }
  }
}
</style>
