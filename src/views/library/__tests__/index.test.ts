import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h, ref } from 'vue'

import LibraryIndexView from '../index.vue'

const artists = ref<Array<Record<string, unknown>>>([])
const loadingArtists = ref(false)
const loadedArtists = ref(false)
const getArtists = vi.fn(async () => undefined)

const sortedAlbumsByReleaseDate = ref<Array<Record<string, unknown>>>([])
const loadingAlbums = ref(false)
const loadedAlbums = ref(false)
const getAlbums = vi.fn(async () => undefined)

const favoritesList = ref<Array<Record<string, unknown>>>([])
const loadingRadio = ref(false)
const loadedRadio = ref(false)
const initializeRadio = vi.fn(async () => undefined)
const playStation = vi.fn(async () => undefined)

const getAvailableLibrary = vi.fn(async () => 'main')

vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    getAvailableLibrary,
  }),
}))

vi.mock('@/stores/artist', () => ({
  useArtistStore: () => ({
    artists,
    loading: loadingArtists,
    loaded: loadedArtists,
    getArtists,
  }),
}))

vi.mock('@/stores/album', () => ({
  useAlbumStore: () => ({
    sortedAlbumsByReleaseDate,
    loading: loadingAlbums,
    loaded: loadedAlbums,
    getAlbums,
  }),
}))

vi.mock('@/stores/radio', () => ({
  useRadioStore: () => ({
    favoritesList,
    loading: loadingRadio,
    loaded: loadedRadio,
    initialize: initializeRadio,
    playStation,
  }),
}))

const PageContentStub = defineComponent({
  name: 'PageContent',
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  setup(props, { slots }) {
    return () => h('section', { class: 'page-content' }, [h('h1', props.title), slots.default?.()])
  },
})

const ContentBoxStub = defineComponent({
  name: 'ContentBox',
  setup(_, { slots, attrs }) {
    return () => h('div', { class: ['content-box', attrs.class] }, slots.default?.())
  },
})

const PosterGridStub = defineComponent({
  name: 'PosterGrid',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    loaded: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () => {
      const first = (props.items as Array<Record<string, unknown>>)[0]
      return h('div', { class: 'poster-grid-stub' }, [
        h('span', { class: 'grid-first-title' }, String(first?.$title ?? first?.name ?? '')),
        h('span', { class: 'grid-first-subtitle' }, String(first?.$subtitle ?? '')),
        h('span', { class: 'grid-first-note' }, String(first?.$note ?? '')),
        h('span', { class: 'grid-first-cover' }, String(first?.$cover_src ?? '')),
        h(
          'button',
          {
            class: 'poster-grid-click',
            onClick: () => emit('click', first),
          },
          'select',
        ),
      ])
    }
  },
})

const IconStub = defineComponent({
  name: 'Icon',
  props: {
    icon: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () => h('span', { class: 'icon-stub', 'data-icon': props.icon })
  },
})

const createWrapper = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/library',
        name: 'library',
        component: { template: '<div>Library</div>' },
      },
      {
        path: '/library/artists/:artistId',
        name: 'artist-album',
        component: { template: '<div>Artist</div>' },
      },
      {
        path: '/library/albums/:albumId',
        name: 'album',
        component: { template: '<div>Album</div>' },
      },
      {
        path: '/library/radio',
        name: 'radio',
        component: { template: '<div>Radio</div>' },
      },
      {
        path: '/library/artists',
        name: 'artists',
        component: { template: '<div>Artists</div>' },
      },
      {
        path: '/library/albums',
        name: 'albums',
        component: { template: '<div>Albums</div>' },
      },
    ],
  })

  await router.push({ name: 'library' })
  await router.isReady()

  const wrapper = mount(LibraryIndexView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        PageContent: PageContentStub,
        ContentBox: ContentBoxStub,
        PosterGrid: PosterGridStub,
        Icon: IconStub,
      },
    },
  })

  return { wrapper, router }
}

describe('library/index.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    artists.value = [{ id: 'artist-1', $id: 'artist-1', name: 'Artist One' }]
    loadingArtists.value = false
    loadedArtists.value = true

    sortedAlbumsByReleaseDate.value = [{ id: 'album-1', $id: 'album-1', name: 'Album One' }]
    loadingAlbums.value = false
    loadedAlbums.value = true

    favoritesList.value = [
      {
        id: 'station-1',
        title: 'Station One',
        url: 'https://radio.example/stream',
        metadata: {
          country: 'Sweden',
          tags: 'jazz, fusion, live, extra',
          logo_url: 'https://img.example/logo.png',
          coverart_url: 'https://img.example/cover.png',
        },
        img: 'https://img.example/legacy.png',
      },
    ]
    loadingRadio.value = false
    loadedRadio.value = true

    getAvailableLibrary.mockResolvedValue('main')
    getArtists.mockResolvedValue(undefined)
    getAlbums.mockResolvedValue(undefined)
    initializeRadio.mockResolvedValue(undefined)
    playStation.mockResolvedValue(undefined)
  })

  describe('unit coverage', () => {
    it('loads library context and all sections on mount', async () => {
      await createWrapper()
      await flushPromises()

      expect(getAvailableLibrary).toHaveBeenCalledTimes(1)
      expect(getArtists).toHaveBeenCalledTimes(1)
      expect(getAlbums).toHaveBeenCalledTimes(1)
      expect(initializeRadio).toHaveBeenCalledTimes(1)
    })

    it('keeps section loading calls even when library resolution fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getAvailableLibrary.mockRejectedValueOnce(new Error('library unavailable'))

      await createWrapper()
      await flushPromises()

      expect(getArtists).toHaveBeenCalledTimes(1)
      expect(getAlbums).toHaveBeenCalledTimes(1)
      expect(initializeRadio).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('maps radio favorites for display with normalized subtitle, tags, and cover source', async () => {
      const { wrapper } = await createWrapper()
      await flushPromises()

      const grids = wrapper.findAll('.poster-grid-stub')
      const radioGrid = grids[2]

      expect(radioGrid.find('.grid-first-title').text()).toBe('Station One')
      expect(radioGrid.find('.grid-first-subtitle').text()).toBe('Sweden')
      expect(radioGrid.find('.grid-first-note').text()).toBe('jazz, fusion, live')
      expect(radioGrid.find('.grid-first-cover').text()).toBe('https://img.example/logo.png')
    })

    it('calls radio playStation with original favorite station payload', async () => {
      const { wrapper } = await createWrapper()
      await flushPromises()

      const grids = wrapper.findAll('.poster-grid-stub')
      const radioGrid = grids[2]

      await radioGrid.find('button.poster-grid-click').trigger('click')
      await flushPromises()

      expect(playStation).toHaveBeenCalledTimes(1)
      expect(playStation).toHaveBeenCalledWith(favoritesList.value[0])
    })

    it('shows radio empty state when favorites are unavailable', async () => {
      favoritesList.value = []
      const { wrapper } = await createWrapper()
      await flushPromises()

      expect(wrapper.text()).toContain('No favorite radio stations saved')
      expect(wrapper.findAll('.poster-grid-stub')).toHaveLength(2)
    })

    it('renders corrected library card class names', async () => {
      const { wrapper } = await createWrapper()

      expect(wrapper.findAll('.libraryCard')).toHaveLength(3)
      expect(wrapper.findAll('.libraryContentBox')).toHaveLength(2)
      expect(wrapper.find('.libaryCard').exists()).toBe(false)
      expect(wrapper.find('.libaryContentBox').exists()).toBe(false)
    })
  })

  describe('regression coverage', () => {
    it('navigates to artist route using fallback $id when id is missing', async () => {
      artists.value = [{ $id: 'artist-fallback', name: 'Fallback Artist' }]
      const { wrapper, router } = await createWrapper()
      await flushPromises()

      const grids = wrapper.findAll('.poster-grid-stub')
      const artistGrid = grids[0]

      await artistGrid.find('button.poster-grid-click').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('artist-album')
      expect(router.currentRoute.value.params.artistId).toBe('artist-fallback')
    })

    it('navigates to album route using fallback $id when id is missing', async () => {
      sortedAlbumsByReleaseDate.value = [{ $id: 'album-fallback', name: 'Fallback Album' }]
      const { wrapper, router } = await createWrapper()
      await flushPromises()

      const grids = wrapper.findAll('.poster-grid-stub')
      const albumGrid = grids[1]

      await albumGrid.find('button.poster-grid-click').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('album')
      expect(router.currentRoute.value.params.albumId).toBe('album-fallback')
    })

    it('does not navigate artist route when both id fields are missing', async () => {
      artists.value = [{ name: 'No ID Artist' }]
      const { wrapper, router } = await createWrapper()
      await flushPromises()

      const initialRoute = router.currentRoute.value.fullPath
      const grids = wrapper.findAll('.poster-grid-stub')
      const artistGrid = grids[0]

      await artistGrid.find('button.poster-grid-click').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe(initialRoute)
    })
  })
})
