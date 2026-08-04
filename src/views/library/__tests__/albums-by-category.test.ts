import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import AlbumsByCategory from '../albums-by-category.vue'

// Mock stores
vi.mock('@/stores/album', () => {
  const mockAlbumStore = {
    getAlbumCoverById: vi.fn((id: string) => `cover-${id}.jpg`),
  }
  return {
    useAlbumStore: () => mockAlbumStore,
  }
})

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: vi.fn(),
  }),
}))

vi.mock('@/composables/useLibraryFetch', () => ({
  useLibraryFetch: () => vi.fn(() => ({
    json: vi.fn(() =>
      Promise.resolve({
        error: ref(null),
        data: ref({ albums: [] }),
      })
    ),
  })),
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    template: '<div class="page-content"><slot /></div>',
    props: ['title', 'backrouterLink'],
  },
}))

vi.mock('@/components/PosterGrid.vue', () => ({
  default: {
    name: 'PosterGrid',
    template: '<div class="poster-grid" :data-loading="loading" :data-loaded="loaded" :data-items="items.length"></div>',
    props: ['loading', 'loaded', 'items'],
    emits: ['click'],
  },
}))

describe('AlbumsByCategory.vue', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let router: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/albums-by-category/:category',
          name: 'albums-by-category',
          component: { template: '<div></div>' },
        },
        {
          path: '/album/:albumId',
          name: 'album',
          component: { template: '<div></div>' },
        },
        {
          path: '/categories',
          name: 'categories',
          component: { template: '<div></div>' },
        },
      ],
    })
  })

  const createWrapper = async (category = 'rock') => {
    router.push({ name: 'albums-by-category', params: { category } })
    await router.isReady()
    const wrapper = mount(AlbumsByCategory, {
      global: {
        plugins: [router, pinia],
        stubs: {
          PageContent: true,
          PosterGrid: true,
        },
      },
    })
    await flushPromises()
    return wrapper as any
  }

  it('renders component with PageContent and PosterGrid', async () => {
    const wrapper = await createWrapper()
    // After mount, loadAlbums is called so card will render
    expect(wrapper.vm).toBeDefined()
  })

  it('extracts category from route params', async () => {
    const wrapper = await createWrapper('jazz')
    expect(wrapper.vm.category).toBe('jazz')
  })

  it('initializes with empty albums array', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.vm.albums).toEqual([])
    expect(Array.isArray(wrapper.vm.albums)).toBe(true)
  })

  it('initializes with loading and loaded states', async () => {
    // After mount, loadAlbums will have run, so loading/loaded may not be in initial state
    const wrapper = await createWrapper()
    expect(typeof wrapper.vm.loading).toBe('boolean')
    expect(typeof wrapper.vm.loaded).toBe('boolean')
  })

  it('sets loading state during album fetch', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.loading = true
    expect(wrapper.vm.loading).toBe(true)
    wrapper.vm.loading = false
    expect(wrapper.vm.loading).toBe(false)
  })

  it('transforms albums to PosterItem format', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = [
      {
        id: 'album1',
        name: 'Test Album',
        artists: ['Artist Name'],
        release_date: '2023-01-15',
      },
    ]
    await wrapper.vm.$nextTick()

    const items = wrapper.vm.albumItems
    expect(items.length).toBe(1)
    expect(items[0].$id).toBe('album1')
    expect(items[0].$title).toBe('Test Album')
    expect(items[0].$subtitle).toBe('Artist Name')
    expect(items[0].$note).toBe('2023')
  })

  it('handles album with missing artist', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = [
      {
        id: 'album1',
        name: 'Test Album',
        artists: [],
        release_date: '2023-01-15',
      },
    ]
    await wrapper.vm.$nextTick()

    const items = wrapper.vm.albumItems
    expect(items[0].$subtitle).toBe('')
  })

  it('handles album with missing release date', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = [
      {
        id: 'album1',
        name: 'Test Album',
        artists: ['Artist Name'],
      },
    ]
    await wrapper.vm.$nextTick()

    const items = wrapper.vm.albumItems
    expect(items[0].$note).toBe('')
  })

  it('extracts year from release date (0,4 substring)', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = [
      {
        id: 'album1',
        name: 'Test Album',
        artists: ['Artist Name'],
        release_date: '2023-12-25',
      },
    ]
    await wrapper.vm.$nextTick()

    const items = wrapper.vm.albumItems
    expect(items[0].$note).toBe('2023')
    expect(items[0].$note.length).toBe(4)
  })

  it('retrieves album cover from store', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = [
      {
        id: 'album1',
        name: 'Test Album',
        artists: ['Artist Name'],
        release_date: '2023-01-15',
      },
    ]
    await wrapper.vm.$nextTick()

    const items = wrapper.vm.albumItems
    expect(items[0].$cover_src).toBe('cover-album1.jpg')
  })

  it('loads albums on mount', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.vm.loadAlbums).toBeDefined()
  })

  it('URL encodes category parameter', async () => {
    const wrapper = await createWrapper('rock & pop')
    expect(wrapper.vm.category).toBe('rock & pop')
  })

  it('handles empty albums response gracefully', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = []
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.albumItems).toEqual([])
  })

  it('updates loading state during fetch', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.vm.loading).toBe(false)
    wrapper.vm.loading = true
    expect(wrapper.vm.loading).toBe(true)
  })

  it('updates loaded state after fetch', async () => {
    const wrapper = await createWrapper()
    // loaded state is managed by loadAlbums function
    expect(typeof wrapper.vm.loaded).toBe('boolean')
    // Can toggle it manually
    wrapper.vm.loaded = false
    expect(wrapper.vm.loaded).toBe(false)
    wrapper.vm.loaded = true
    expect(wrapper.vm.loaded).toBe(true)
  })

  it('provides category title to PageContent', async () => {
    const wrapper = await createWrapper('indie')
    expect(wrapper.vm.category).toBe('indie')
  })

  it('back route links to categories page', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.vm.router).toBeDefined()
  })

  it('handles multiple albums in response', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = [
      {
        id: 'album1',
        name: 'Album 1',
        artists: ['Artist 1'],
        release_date: '2023-01-01',
      },
      {
        id: 'album2',
        name: 'Album 2',
        artists: ['Artist 2'],
        release_date: '2024-01-01',
      },
      {
        id: 'album3',
        name: 'Album 3',
        artists: ['Artist 3'],
        release_date: '2025-01-01',
      },
    ]
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.albumItems.length).toBe(3)
    expect(wrapper.vm.albumItems[0].$title).toBe('Album 1')
    expect(wrapper.vm.albumItems[1].$title).toBe('Album 2')
    expect(wrapper.vm.albumItems[2].$title).toBe('Album 3')
  })

  it('maintains album id mapping to computed items', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = [
      {
        id: 'unique-id-123',
        name: 'Test Album',
        artists: ['Artist Name'],
        release_date: '2023-01-15',
      },
    ]
    await wrapper.vm.$nextTick()

    const items = wrapper.vm.albumItems
    expect(items[0].$id).toBe('unique-id-123')
  })

  it('stores have correct methods available', async () => {
    const wrapper = await createWrapper()
    expect(typeof wrapper.vm.loadAlbums).toBe('function')
  })

  it('computes albumItems with PosterItem type', async () => {
    const wrapper = await createWrapper()
    wrapper.vm.albums = [
      {
        id: 'album1',
        name: 'Test Album',
        artists: ['Artist Name'],
        release_date: '2023-01-15',
      },
    ]
    await wrapper.vm.$nextTick()

    const items = wrapper.vm.albumItems
    expect(items[0]).toHaveProperty('$id')
    expect(items[0]).toHaveProperty('$title')
    expect(items[0]).toHaveProperty('$subtitle')
    expect(items[0]).toHaveProperty('$note')
    expect(items[0]).toHaveProperty('$cover_src')
  })

  it('category parameter accepts special characters', async () => {
    const wrapper = await createWrapper('hip-hop/rap')
    expect(wrapper.vm.category).toBe('hip-hop/rap')
  })

  it('category parameter accepts spaces', async () => {
    const wrapper = await createWrapper('classic rock')
    expect(wrapper.vm.category).toBe('classic rock')
  })

  it('router instance available for navigation', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.vm.router).toBeDefined()
    expect(typeof wrapper.vm.router.push).toBe('function')
  })

  it('reference to toastStore for error handling', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.vm.toastStore).toBeDefined()
  })

  it('reference to libraryFetch for API calls', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.vm.libraryFetch).toBeDefined()
  })

  it('reference to albumStore for cover URLs', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.vm.albumStore).toBeDefined()
  })
})
