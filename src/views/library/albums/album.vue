<template>
  <div class="album">
    <div class="breadcrumbs">
      <BackRouter :to="backRoute" :loading="loading">{{ backText }}</BackRouter>
    </div>

    <div class="grid">
      <div class="col-6-md">
        <AlbumDetailsCard :album="album" :loading="loading" />
      </div>
      <div class="col-6-md">
        <TracksCard :tracks="album?.tracks || []" :loading="loading" :album="album" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useAlbumStore } from '@/stores/album.ts'
import BackRouter from '@/components/BackRouter.vue'
import AlbumDetailsCard from '@/components/AlbumDetailsCard.vue'
import TracksCard from '@/components/TracksCard.vue'

const route = useRoute()

const albumStore = useAlbumStore()
const { album, loading } = storeToRefs(albumStore)
const { getAlbumByAlbumId } = albumStore

const id = computed(() => route.params.albumId as string)

// Extract source info from query for consistency
const sourceInfo = computed(() => ({
  from: route.query.from as string | undefined,
  artistId: route.query.artistId as string | undefined,
  artistName: route.query.artistName as string | undefined,
}))

// Determine back route based on source
const backRoute = computed(() => {
  if (sourceInfo.value.from === 'artist' && sourceInfo.value.artistId) {
    return { name: 'artist-album', params: { artistId: sourceInfo.value.artistId } }
  }
  return { name: 'albums' }
})

// Determine back text based on source
const backText = computed(() => {
  if (sourceInfo.value.from === 'artist' && sourceInfo.value.artistName) {
    return sourceInfo.value.artistName
  }
  return 'Albums'
})

onMounted(async () => {
  try {
    await getAlbumByAlbumId(id.value)
  } catch (error) {
    console.error('Failed to load album:', error)
  }
})
</script>

<style scoped lang="scss"></style>
