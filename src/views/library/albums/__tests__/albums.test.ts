import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref, type Ref } from 'vue'

import AlbumsView from '@/views/library/albums/albums.vue'
import { deleteAlbum as apiDeleteAlbum } from '@/api/audiocontrol-library'

const runtime = vi.hoisted(() => {
  return {
    loading: null as unknown as Ref<boolean>,
    loaded: null as unknown as Ref<boolean>,
    sortedAlbums: null as unknown as Ref<Array<{ id: string }>>,
    sortBy: null as unknown as Ref<'release_date' | 'artist' | 'random'>,
    sortOrder: null as unknown as Ref<'asc' | 'desc'>,
    genres: null as unknown as Ref<string[]>,
    selectedGenres: null as unknown as Ref<string[]>,
    supportsDelete: null as unknown as Ref<boolean>,
    activeLibrary: null as unknown as Ref<string>,

    getAlbums: vi.fn(async () => undefined),
    clearSearch: vi.fn(),
    setSortBy: vi.fn(),
    toggleSortOrder: vi.fn(),
    shuffleAlbums: vi.fn(),
    loadGenres: vi.fn(async () => undefined),
    setGenreFilter: vi.fn(),
    setSearchQuery: vi.fn(),

    sendCommand: vi.fn(async () => undefined),
    sendLibraryCommand: vi.fn(async () => undefined),
    addTrackToQueue: vi.fn(async () => undefined),

    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),

    libraryFetchImpl: vi.fn(),
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
    loading: runtime.loading,
    loaded: runtime.loaded,
    sortedAlbums: runtime.sortedAlbums,
    sortBy: runtime.sortBy,
    sortOrder: runtime.sortOrder,
    genres: runtime.genres,
    selectedGenres: runtime.selectedGenres,
    getAlbums: runtime.getAlbums,
    clearSearch: runtime.clearSearch,
    setSortBy: runtime.setSortBy,
    toggleSortOrder: runtime.toggleSortOrder,
    shuffleAlbums: runtime.shuffleAlbums,
    loadGenres: runtime.loadGenres,
    setGenreFilter: runtime.setGenreFilter,
    setSearchQuery: runtime.setSearchQuery,
  }),
}))

vi.mock('@/stores/player', () => ({
  usePlayerStore: () => ({
    sendCommand: runtime.sendCommand,
    sendLibraryCommand: runtime.sendLibraryCommand,
    addTrackToQueue: runtime.addTrackToQueue,
  }),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: runtime.showErrorToast,
    showSuccessToast: runtime.showSuccessToast,
  }),
}))

vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    supportsDelete: runtime.supportsDelete,
    activeLibrary: runtime.activeLibrary,
  }),
}))

vi.mock('@/composables/useLibraryFetch', () => ({
  useLibraryFetch: () => runtime.libraryFetchImpl,
}))

vi.mock('@/api/audiocontrol-library', () => ({
  deleteAlbum: vi.fn(async () => undefined),
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template: '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/SortSelector.vue', () => ({
  default: {
    name: 'SortSelector',
    props: ['sortBy', 'sortOrder'],
    emits: ['sort-by-change', 'toggle-order'],
    template: `
      <div class="sort-selector-stub">
        <button class="sort-release" @click="$emit('sort-by-change', 'release_date')">release</button>
        <button class="sort-artist" @click="$emit('sort-by-change', 'artist')">artist</button>
        <button class="sort-random" @click="$emit('sort-by-change', 'random')">random</button>
        <button class="sort-toggle" @click="$emit('toggle-order')">toggle</button>
      </div>
    `,
  },
}))

vi.mock('@/components/CustomSearchField.vue', () => ({
  default: {
    name: 'CustomSearchField',
    props: ['modelValue'],
    emits: ['change', 'update:modelValue'],
    template: `
      <div class="search-stub">
        <button class="search-change" @click="$emit('change', 'Beatles')">change</button>
        <button class="search-vmodel" @click="$emit('update:modelValue', 'Radiohead')">vmodel</button>
      </div>
    `,
  },
}))

vi.mock('@/components/PosterGrid.vue', () => ({
  default: {
    name: 'PosterGrid',
    props: ['loading', 'loaded', 'items'],
    emits: ['click', 'contextmenu'],
    template: `
      <div class="poster-grid-stub" :data-loading="loading ? 'yes' : 'no'" :data-loaded="loaded ? 'yes' : 'no'" :data-items="items.length">
        <button class="poster-open" @click="$emit('click', items[0] ?? { id: 'fallback-id' })">open</button>
        <button class="poster-menu" @contextmenu.prevent="$emit('contextmenu', items[0] ?? { id: 'fallback-id' }, $event)">menu</button>
      </div>
    `,
  },
}))

function setLibraryTracks(tracks: Array<{ id?: string; uri?: string }>) {
  runtime.libraryFetchImpl.mockImplementation(() => ({
    json: vi.fn(async () => ({
      data: { value: { album: { tracks } } },
    })),
  }))
}

function setLibraryFetchFailure() {
  runtime.libraryFetchImpl.mockImplementation(() => ({
    json: vi.fn(async () => {
      throw new Error('fetch failed')
    }),
  }))
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/albums', name: 'albums', component: { template: '<div>Albums</div>' } },
      { path: '/album/:albumId', name: 'album', component: { template: '<div>Album</div>' } },
      { path: '/library', name: 'library', component: { template: '<div>Library</div>' } },
    ],
  })
}

async function mountView() {
  const router = createTestRouter()
  await router.push({ name: 'albums' })
  await router.isReady()

  const wrapper = mount(AlbumsView, {
    global: {
      plugins: [router],
      stubs: { Teleport: true },
    },
    attachTo: document.body,
  })

  await flushPromises()
  return { wrapper, router }
}

describe('albums.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    runtime.loading = ref(false)
    runtime.loaded = ref(true)
    runtime.sortedAlbums = ref([{ id: 'album-1' }])
    runtime.sortBy = ref('release_date')
    runtime.sortOrder = ref('desc')
    runtime.genres = ref([])
    runtime.selectedGenres = ref([])
    runtime.supportsDelete = ref(false)
    runtime.activeLibrary = ref('default')

    runtime.getAlbums.mockClear()
    runtime.clearSearch.mockClear()
    runtime.setSortBy.mockClear()
    runtime.toggleSortOrder.mockClear()
    runtime.shuffleAlbums.mockClear()
    runtime.loadGenres.mockClear()
    runtime.setGenreFilter.mockClear()
    runtime.setSearchQuery.mockClear()

    runtime.sendCommand.mockClear()
    runtime.sendLibraryCommand.mockClear()
    runtime.addTrackToQueue.mockClear()

    runtime.showErrorToast.mockClear()
    runtime.showSuccessToast.mockClear()

    runtime.libraryFetchImpl.mockReset()
    setLibraryTracks([])

    vi.mocked(apiDeleteAlbum).mockClear()
  })

  it('loads albums and genres on mount and wires page shell contract', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener')

    const { wrapper } = await mountView()

    expect(wrapper.get('.page-content-stub').attributes('data-title')).toBe('Albums')
    expect(wrapper.get('.page-content-stub').attributes('data-back-link')).toBe('library')
    expect(runtime.getAlbums).toHaveBeenCalledTimes(1)
    expect(runtime.clearSearch).toHaveBeenCalledTimes(1)
    expect(runtime.loadGenres).toHaveBeenCalledTimes(1)
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))

    addSpy.mockRestore()
  })

  it('removes document click listener on unmount', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { wrapper } = await mountView()

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('routes to album details when poster item is clicked', async () => {
    const { wrapper, router } = await mountView()

    await wrapper.get('.poster-open').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('album')
    expect(router.currentRoute.value.params.albumId).toBe('album-1')
    expect(router.currentRoute.value.query.from).toBe('albums')
  })

  it('switches sort modes and enforces release_date-only order toggling', async () => {
    const { wrapper } = await mountView()

    await wrapper.get('.sort-random').trigger('click')
    await wrapper.get('.sort-artist').trigger('click')
    await wrapper.get('.sort-toggle').trigger('click')

    expect(runtime.shuffleAlbums).toHaveBeenCalledTimes(1)
    expect(runtime.setSortBy).toHaveBeenCalledWith('artist')
    expect(runtime.toggleSortOrder).toHaveBeenCalledTimes(1)

    runtime.sortBy.value = 'random'
    await wrapper.get('.sort-toggle').trigger('click')

    expect(runtime.toggleSortOrder).toHaveBeenCalledTimes(1)
  })

  it('handles search change and v-model updates via CustomSearchField', async () => {
    const { wrapper } = await mountView()

    await wrapper.get('.search-change').trigger('click')
    await wrapper.get('.search-vmodel').trigger('click')

    expect(runtime.setSearchQuery).toHaveBeenCalledWith('Beatles')
  })

  it('uses shuffle button click contract', async () => {
    const { wrapper } = await mountView()

    await wrapper.get('.shuffle-btn').trigger('click')

    expect(runtime.shuffleAlbums).toHaveBeenCalledTimes(1)
  })

  it('shows genre dropdown only when genres exist and toggles menu state', async () => {
    runtime.genres.value = ['rock', 'pop']
    const { wrapper } = await mountView()

    expect(wrapper.find('.genre-dropdown').exists()).toBe(true)
    expect(wrapper.find('.genre-menu').exists()).toBe(false)

    await wrapper.get('.genre-dropdown-btn').trigger('click')
    expect(wrapper.find('.genre-menu').exists()).toBe(true)
  })

  it('adds and removes genre filters from current selection', async () => {
    runtime.genres.value = ['rock']
    runtime.selectedGenres.value = ['rock']
    const { wrapper } = await mountView()

    await wrapper.get('.genre-dropdown-btn').trigger('click')
    await wrapper.get('.genre-option input').trigger('change')
    expect(runtime.setGenreFilter).toHaveBeenLastCalledWith([])

    runtime.selectedGenres.value = []
    await wrapper.get('.genre-option input').trigger('change')
    expect(runtime.setGenreFilter).toHaveBeenLastCalledWith(['rock'])
  })

  it('closes an open genre menu when clicking outside', async () => {
    runtime.genres.value = ['rock']
    const { wrapper } = await mountView()

    await wrapper.get('.genre-dropdown-btn').trigger('click')
    expect(wrapper.find('.genre-menu').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.find('.genre-menu').exists()).toBe(false)
  })

  it('opens context menu with album id and coordinates and closes on document click', async () => {
    const { wrapper } = await mountView()

    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 110, clientY: 240 })

    const menu = wrapper.get('.album-context-menu')
    expect(menu.attributes('style')).toContain('top: 240px')
    expect(menu.attributes('style')).toContain('left: 110px')

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.find('.album-context-menu').exists()).toBe(false)
  })

  it('plays now by pausing, clearing queue, enqueueing tracks, and starting playback', async () => {
    setLibraryTracks([{ id: 't1' }, { uri: 'u2' }])
    const { wrapper } = await mountView()

    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.get('.ctx-item').trigger('click')
    await flushPromises()

    expect(runtime.sendCommand).toHaveBeenNthCalledWith(1, 'pause')
    expect(runtime.sendCommand).toHaveBeenNthCalledWith(2, 'clear_queue')
    expect(runtime.addTrackToQueue).toHaveBeenCalledTimes(2)
    expect(runtime.sendLibraryCommand).toHaveBeenCalledWith('play')
  })

  it('returns early for play now when fetched tracks are empty', async () => {
    setLibraryTracks([])
    const { wrapper } = await mountView()

    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.get('.ctx-item').trigger('click')
    await flushPromises()

    expect(runtime.sendCommand).not.toHaveBeenCalled()
    expect(runtime.sendLibraryCommand).not.toHaveBeenCalled()
  })

  it('shows error toast when play now fetch fails', async () => {
    setLibraryFetchFailure()
    const { wrapper } = await mountView()

    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.get('.ctx-item').trigger('click')
    await flushPromises()

    expect(runtime.showErrorToast).toHaveBeenCalledWith('Failed to play album')
  })

  it('adds album tracks to queue and handles failure branch', async () => {
    setLibraryTracks([{ id: 't1' }])
    const { wrapper } = await mountView()

    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.findAll('.ctx-item')[1].trigger('click')
    await flushPromises()
    expect(runtime.addTrackToQueue).toHaveBeenCalledTimes(1)

    runtime.addTrackToQueue.mockImplementationOnce(async () => {
      throw new Error('queue-failed')
    })
    setLibraryTracks([{ id: 't2' }])

    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.findAll('.ctx-item')[1].trigger('click')
    await flushPromises()
    expect(runtime.showErrorToast).toHaveBeenCalledWith('Failed to add album to queue')
  })

  it('uses empty-track fallback when library response has no album payload', async () => {
    runtime.libraryFetchImpl.mockImplementation(() => ({
      json: vi.fn(async () => ({ data: { value: {} } })),
    }))
    const { wrapper } = await mountView()

    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.findAll('.ctx-item')[1].trigger('click')
    await flushPromises()

    expect(runtime.addTrackToQueue).not.toHaveBeenCalled()
    expect(runtime.showErrorToast).not.toHaveBeenCalledWith('Failed to add album to queue')
  })

  it('supports delete flow: cancel, no library selected, success, and API failure', async () => {
    runtime.supportsDelete.value = true
    const confirmMock = vi.fn()
    vi.stubGlobal('confirm', confirmMock)
    const { wrapper } = await mountView()

    confirmMock.mockReturnValueOnce(false)
    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.get('.ctx-item--danger').trigger('click')
    await flushPromises()
    expect(apiDeleteAlbum).not.toHaveBeenCalled()

    runtime.activeLibrary.value = ''
    confirmMock.mockReturnValueOnce(true)
    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.get('.ctx-item--danger').trigger('click')
    await flushPromises()
    expect(runtime.showErrorToast).toHaveBeenCalledWith('No library selected')

    runtime.activeLibrary.value = 'default'
    vi.mocked(apiDeleteAlbum).mockResolvedValueOnce(undefined)
    confirmMock.mockReturnValueOnce(true)
    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.get('.ctx-item--danger').trigger('click')
    await flushPromises()
    expect(apiDeleteAlbum).toHaveBeenCalledWith('default', 'album-1')
    expect(runtime.showSuccessToast).toHaveBeenCalledWith('Album deleted')
    expect(runtime.getAlbums).toHaveBeenCalledTimes(2)

    vi.mocked(apiDeleteAlbum).mockRejectedValueOnce(new Error('delete failed'))
    confirmMock.mockReturnValueOnce(true)
    await wrapper.get('.poster-menu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await wrapper.get('.ctx-item--danger').trigger('click')
    await flushPromises()
    expect(runtime.showErrorToast).toHaveBeenCalledWith('Failed to delete album')

    vi.unstubAllGlobals()
  })
})
