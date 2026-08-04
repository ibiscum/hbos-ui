<template>
  <PageContent title="Music Library">
    <ContentBox>
      <div class="libraryCard">
        <div class="title">
          <h2>Artists</h2>
          <router-link v-if="artists.length > 0" :to="{ name: 'artists' }" class="text-link">View All</router-link>
        </div>
        <PosterGrid :loading="loadingArtists" :loaded="loadedArtists" :items="artists" poster-form="circle" in-row
          @click="(artist) => {
            const artistId = getRouteItemId(artist)
            if (artistId) {
              router.push({ name: 'artist-album', params: { artistId } })
            }
          }"
        />
      </div>
    </ContentBox>

    <ContentBox class="libraryContentBox">
      <div class="libraryCard">
        <div class="title">
          <h2>Albums</h2>
          <router-link v-if="sortedAlbumsByReleaseDate.length > 0" :to="{ name: 'albums' }" class="text-link">View
            All</router-link>
        </div>
        <PosterGrid :loading="loadingAlbums" :loaded="loadedAlbums" :items="sortedAlbumsByReleaseDate" in-row
          @click="(album) => {
            const albumId = getRouteItemId(album)
            if (albumId) {
              router.push({ name: 'album', params: { albumId } })
            }
          }"
        />
      </div>
    </ContentBox>

    <ContentBox class="libraryContentBox">
      <div class="libraryCard">
        <div class="title">
          <h2>Radio</h2>
          <router-link :to="{ name: 'radio' }" class="text-link">View All</router-link>
        </div>

        <div v-if="favoritesList.length === 0" class="empty-state">
          <Icon icon="radio" class="empty-icon" />
          <p>No favorite radio stations saved</p>
        </div>

        <PosterGrid v-else :loading="loading" :loaded="loaded" :items="favoriteStationsForDisplay" in-row
          @click="playStation" />
      </div>
    </ContentBox>
  </PageContent>
</template>

<script setup lang="ts">
import ContentBox from '@/components/ContentBox.vue'
import PageContent from '@/components/PageContent.vue'
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useRouter } from 'vue-router'
const router = useRouter()

import { useLibraryStore } from '@/stores/library'
const libraryStore = useLibraryStore()

import { useArtistStore } from '@/stores/artist'
const artistStore = useArtistStore()
const { artists, loading: loadingArtists, loaded: loadedArtists } = storeToRefs(artistStore)
const { getArtists } = artistStore

import { useRadioStore, type RadioFavorite } from '@/stores/radio'
const radioStore = useRadioStore()
const {
  favoritesList,
  loading,
  loaded
} = storeToRefs(radioStore)

interface RouteItem {
  id?: string
  $id?: string
}

const getRouteItemId = (item: RouteItem | undefined) => item?.id ?? item?.$id

// Convert radio favorites to poster grid format
const favoriteStationsForDisplay = computed(() => {
  return favoritesList.value.map((station: RadioFavorite) => ({
    $id: station.id,
    $title: station.title,
    $subtitle: station.metadata?.country || station.country || 'Radio Station',
    $note: (station.metadata?.tags || station.tags)
      ? String(station.metadata?.tags || station.tags)
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(', ')
      : '',
    $cover_src: (typeof station.metadata?.logo_url === 'string' ? station.metadata.logo_url : '') ||
                (typeof station.metadata?.coverart_url === 'string' ? station.metadata.coverart_url : '') ||
                station.img || ''
  }))
})

const playStation = async (station: { $id?: string }) => {
  // Find the original favorite station data
  const originalStation = favoritesList.value.find(fav => fav.id === station.$id)
  if (originalStation) {
    await radioStore.playStation(originalStation)
  }
}

import { useAlbumStore } from '@/stores/album'
import PosterGrid from '@/components/PosterGrid.vue'
import Icon from '@/components/Icon.vue'
const albumStore = useAlbumStore()
const {
  sortedAlbumsByReleaseDate,
  loading: loadingAlbums,
  loaded: loadedAlbums,
} = storeToRefs(albumStore)
const { getAlbums } = albumStore

onMounted(async () => {
  try {
    await libraryStore.getAvailableLibrary()
  } catch (error) {
    console.error('Failed to resolve active library for library view:', error)
  }

  const results = await Promise.allSettled([getArtists(), getAlbums(), radioStore.initialize()])
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const section = ['artists', 'albums', 'radio'][index]
      console.error(`Failed to load ${section} section:`, result.reason)
    }
  })
})
</script>

<style scoped lang="scss">
.title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;

  h2 {
    margin-bottom: 0;
  }
}

.libraryCard {
  padding: 25px;
}


.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-secondary);

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.6;
  }

  p {
    margin: 0;
    font-size: 16px;
  }
}
</style>
