import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { ref, type Ref } from 'vue'

import AlbumView from '@/views/library/albums/album.vue'

type AlbumShape = {
  id?: string
  tracks?: Array<{ id: string }>
}

const runtime = vi.hoisted(() => {
  return {
    album: null as unknown as Ref<AlbumShape | null>,
    loading: null as unknown as Ref<boolean>,
    getAlbumByAlbumId: vi.fn(async () => undefined),
  }
})

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()
  return {
    ...actual,
    storeToRefs: <T extends object>(store: T): T => store,
  }
})

vi.mock('@/stores/album', () => ({
  useAlbumStore: () => ({
    album: runtime.album,
    loading: runtime.loading,
    getAlbumByAlbumId: runtime.getAlbumByAlbumId,
  }),
}))

vi.mock('@/components/BackRouter.vue', () => ({
  default: {
    name: 'BackRouter',
    props: ['to', 'loading'],
    template:
      '<div class="back-router-stub" :data-to-name="to?.name" :data-to-artist-id="to?.params?.artistId" :data-loading="loading ? \'yes\' : \'no\'"><slot /></div>',
  },
}))

vi.mock('@/components/AlbumDetailsCard.vue', () => ({
  default: {
    name: 'AlbumDetailsCard',
    props: ['album', 'loading'],
    template:
      '<div class="album-details-stub" :data-has-album="album ? \'yes\' : \'no\'" :data-loading="loading ? \'yes\' : \'no\'" />',
  },
}))

vi.mock('@/components/TracksCard.vue', () => ({
  default: {
    name: 'TracksCard',
    props: ['tracks', 'loading', 'album'],
    template:
      '<div class="tracks-card-stub" :data-tracks-len="tracks.length" :data-loading="loading ? \'yes\' : \'no\'" :data-has-album="album ? \'yes\' : \'no\'" />',
  },
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/album/:albumId', name: 'album', component: AlbumView },
      { path: '/artist/:artistId', name: 'artist-album', component: { template: '<div>Artist</div>' } },
      { path: '/albums', name: 'albums', component: { template: '<div>Albums</div>' } },
    ],
  })
}

async function mountView(params: {
  albumId?: string
  from?: string
  artistId?: string
  artistName?: string
} = {}) {
  const router = createTestRouter()
  await router.push({
    name: 'album',
    params: { albumId: params.albumId ?? 'album-1' },
    query: {
      ...(params.from ? { from: params.from } : {}),
      ...(params.artistId ? { artistId: params.artistId } : {}),
      ...(params.artistName ? { artistName: params.artistName } : {}),
    },
  })
  await router.isReady()

  const wrapper = mount(AlbumView, {
    global: {
      plugins: [router, createPinia()],
    },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('album.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    runtime.album = ref(null)
    runtime.loading = ref(false)
    runtime.getAlbumByAlbumId.mockReset()
    runtime.getAlbumByAlbumId.mockResolvedValue(undefined)
  })

  it('renders shell and loads album by route id on mount', async () => {
    const { wrapper } = await mountView({ albumId: 'album-123' })

    expect(wrapper.find('.album').exists()).toBe(true)
    expect(wrapper.find('.breadcrumbs').exists()).toBe(true)
    expect(wrapper.find('.grid').exists()).toBe(true)
    expect(runtime.getAlbumByAlbumId).toHaveBeenCalledWith('album-123')
  })

  it('uses albums route and Albums label by default', async () => {
    const { wrapper } = await mountView({ albumId: 'album-1' })

    const backRouter = wrapper.get('.back-router-stub')
    expect(backRouter.attributes('data-to-name')).toBe('albums')
    expect(backRouter.text()).toBe('Albums')
  })

  it('uses artist back route when query has from=artist with artistId', async () => {
    const { wrapper } = await mountView({
      albumId: 'album-1',
      from: 'artist',
      artistId: 'artist-42',
    })

    const backRouter = wrapper.get('.back-router-stub')
    expect(backRouter.attributes('data-to-name')).toBe('artist-album')
    expect(backRouter.attributes('data-to-artist-id')).toBe('artist-42')
  })

  it('uses artistName as back text when from=artist and artistName exists', async () => {
    const { wrapper } = await mountView({
      albumId: 'album-1',
      from: 'artist',
      artistId: 'artist-42',
      artistName: 'The Artist',
    })

    expect(wrapper.get('.back-router-stub').text()).toBe('The Artist')
  })

  it('falls back to Albums text when from=artist but artistName is missing', async () => {
    const { wrapper } = await mountView({
      albumId: 'album-1',
      from: 'artist',
      artistId: 'artist-42',
    })

    expect(wrapper.get('.back-router-stub').text()).toBe('Albums')
  })

  it('falls back to albums route when from=artist but artistId is missing', async () => {
    const { wrapper } = await mountView({
      albumId: 'album-1',
      from: 'artist',
      artistName: 'Nameless Id',
    })

    expect(wrapper.get('.back-router-stub').attributes('data-to-name')).toBe('albums')
  })

  it('passes tracks to TracksCard and falls back to empty array when album/tracks missing', async () => {
    runtime.album.value = { id: 'album-1', tracks: [{ id: 'track-1' }, { id: 'track-2' }] }
    const { wrapper: withTracks } = await mountView()
    expect(withTracks.get('.tracks-card-stub').attributes('data-tracks-len')).toBe('2')

    runtime.album.value = { id: 'album-2' }
    const { wrapper: noTracks } = await mountView({ albumId: 'album-2' })
    expect(noTracks.get('.tracks-card-stub').attributes('data-tracks-len')).toBe('0')

    runtime.album.value = null
    const { wrapper: noAlbum } = await mountView({ albumId: 'album-3' })
    expect(noAlbum.get('.tracks-card-stub').attributes('data-tracks-len')).toBe('0')
  })

  it('propagates loading state to BackRouter and child cards', async () => {
    runtime.loading.value = true
    runtime.album.value = { id: 'album-1', tracks: [] }

    const { wrapper } = await mountView()

    expect(wrapper.get('.back-router-stub').attributes('data-loading')).toBe('yes')
    expect(wrapper.get('.album-details-stub').attributes('data-loading')).toBe('yes')
    expect(wrapper.get('.tracks-card-stub').attributes('data-loading')).toBe('yes')
  })

  it('logs mount fetch failures without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new Error('fetch failed')
    runtime.getAlbumByAlbumId.mockRejectedValueOnce(failure)

    await mountView({ albumId: 'album-fail' })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load album:', failure)
    consoleSpy.mockRestore()
  })
})
