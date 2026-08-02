<template>
  <PageContent :title="category" :backrouterLink="{ name: 'genres' }">
    <div class="card">
      <PosterGrid
        :loading="loading"
        :loaded="loaded"
        :items="albumItems"
        @click="(album) => router.push({ name: 'album', params: { albumId: album.$id }, query: { from: 'genres' } })"
      />
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import PageContent from '@/components/PageContent.vue'
import PosterGrid from '@/components/PosterGrid.vue'

import type { PosterItem } from '@/types/library'

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { useToastStore } from '@/stores/toast'
import { useAlbumStore } from '@/stores/album.ts'

const route = useRoute()
const router = useRouter()
const libraryFetch = useLibraryFetch()
const toastStore = useToastStore()
const albumStore = useAlbumStore()

const YEAR_SUBSTRING_LENGTH = 4

const category = computed<string>(() => {
  const cat = route.params.category as string
  if (!cat) {
    console.warn('Genre parameter missing from route')
  }
  return cat
})

interface Album {
  id: string
  name: string
  artists: string[]
  release_date?: string
}

const albums = ref<Album[]>([])
const loading = ref<boolean>(false)
const loaded = ref<boolean>(false)

const albumItems = computed<PosterItem[]>(() =>
  albums.value.map((album) => {
    if (!album?.id || !album?.name) {
      console.warn('Invalid album data:', album)
      return {
        $id: album?.id ?? '',
        $title: album?.name ?? '',
        $subtitle: '',
        $note: '',
        $cover_src: '',
      }
    }
    return {
      $id: album.id,
      $title: album.name,
      $subtitle: album.artists?.[0] ?? '',
      $note: album.release_date ? album.release_date.substring(0, YEAR_SUBSTRING_LENGTH) : '',
      $cover_src: albumStore.getAlbumCoverById(album.id),
    }
  })
)

const loadAlbums = async (): Promise<void> => {
  loading.value = true
  loaded.value = false
  albums.value = []

  if (!category.value) {
    toastStore.showErrorToast('Genre not specified')
    loading.value = false
    loaded.value = true
    return
  }

  const encodedGenre = encodeURIComponent(category.value)
  const { error, data } = await libraryFetch<{ albums: Album[] }>(
    `/library/:activeLibrary/albums/by-genre/${encodedGenre}`,
  ).json()

  if (error.value) {
    const errorMessage = typeof error.value === 'string' ? error.value : 'Unknown error'
    toastStore.showErrorToast(`Failed to load albums: ${errorMessage}`)
  } else if (data.value?.albums) {
    albums.value = data.value.albums
  }

  loading.value = false
  loaded.value = true
}

onMounted(async () => {
  try {
    await loadAlbums()
  } catch {
    console.error('Error loading albums by genre')
    toastStore.showErrorToast('An error occurred while loading albums')
  }
})
</script>
