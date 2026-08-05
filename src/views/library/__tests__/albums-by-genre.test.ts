import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

import AlbumsByGenre from '../albums-by-genre.vue'

const {
  libraryFetchMock,
  fetchJsonMock,
  showErrorToastMock,
  getAlbumCoverByIdMock,
} = vi.hoisted(() => ({
  libraryFetchMock: vi.fn(),
  fetchJsonMock: vi.fn(),
  showErrorToastMock: vi.fn(),
  getAlbumCoverByIdMock: vi.fn(),
}))

vi.mock('@/stores/album', () => ({
  useAlbumStore: () => ({
    getAlbumCoverById: getAlbumCoverByIdMock,
  }),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: showErrorToastMock,
  }),
}))

vi.mock('@/composables/useLibraryFetch', () => ({
  useLibraryFetch: () => libraryFetchMock,
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    template: '<div class="page-content"><h1 data-testid="title">{{ title }}</h1><slot /></div>',
    props: ['title', 'backrouterLink'],
  },
}))

vi.mock('@/components/PosterGrid.vue', () => ({
  default: {
    name: 'PosterGrid',
    template:
      '<div class="poster-grid" :data-loading="String(loading)" :data-loaded="String(loaded)" :data-count="items.length"><button data-testid="poster-click" @click="$emit(\'click\', items[0])">open</button></div>',
    props: ['loading', 'loaded', 'items'],
    emits: ['click'],
  },
}))

describe('albums-by-genre.vue', () => {
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    setActivePinia(createPinia())

    vi.clearAllMocks()

    getAlbumCoverByIdMock.mockImplementation((id: string) => `cover-${id}.jpg`)
    libraryFetchMock.mockReturnValue({ json: fetchJsonMock })
    fetchJsonMock.mockResolvedValue({
      error: ref(null),
      data: ref({ albums: [] }),
    })
  })

  const createRouterForTest = () =>
    createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/albums-by-genre/:category?',
          name: 'albums-by-genre',
          component: { template: '<div />' },
        },
        {
          path: '/album/:albumId',
          name: 'album',
          component: { template: '<div />' },
        },
        {
          path: '/genres',
          name: 'genres',
          component: { template: '<div />' },
        },
      ],
    })

  const mountView = async (genre: string | undefined = 'rock') => {
    const router = createRouterForTest()

    if (genre === undefined) {
      router.push({ name: 'albums-by-genre' })
    } else {
      router.push({ name: 'albums-by-genre', params: { category: genre } })
    }

    await router.isReady()

    const wrapper = mount(AlbumsByGenre, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    return { wrapper, router }
  }

  it('renders category title and requests encoded genre on mount', async () => {
    await mountView('rock & roll')

    expect(libraryFetchMock).toHaveBeenCalledWith('/library/:activeLibrary/albums/by-genre/rock%20%26%20roll')
  })

  it('maps fetched albums into PosterGrid items with cover and year', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref(null),
      data: ref({
        albums: [
          {
            id: 'album1',
            name: 'Test Album',
            artists: ['Artist Name'],
            release_date: '2023-12-25',
          },
        ],
      }),
    })

    const { wrapper } = await mountView('jazz')
    const albumItems = wrapper.vm.albumItems

    expect(wrapper.find('[data-testid="title"]').text()).toBe('jazz')
    expect(wrapper.find('.poster-grid').attributes('data-count')).toBe('1')
    expect(albumItems[0]).toEqual({
      $id: 'album1',
      $title: 'Test Album',
      $subtitle: 'Artist Name',
      $note: '2023',
      $cover_src: 'cover-album1.jpg',
    })
    expect(getAlbumCoverByIdMock).toHaveBeenCalledWith('album1')
  })

  it('warns and normalizes invalid albums with missing id or name', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref(null),
      data: ref({
        albums: [
          {
            id: '',
            name: 'Nameless ID',
            artists: [],
          },
          {
            id: 'missing-name',
            name: '',
            artists: [],
          },
        ],
      }),
    })

    const { wrapper } = await mountView('electronic')

    expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid album data:', {
      id: '',
      name: 'Nameless ID',
      artists: [],
    })
    expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid album data:', {
      id: 'missing-name',
      name: '',
      artists: [],
    })
    expect(wrapper.vm.albumItems).toEqual([
      {
        $id: '',
        $title: 'Nameless ID',
        $subtitle: '',
        $note: '',
        $cover_src: '',
      },
      {
        $id: 'missing-name',
        $title: '',
        $subtitle: '',
        $note: '',
        $cover_src: '',
      },
    ])
    expect(getAlbumCoverByIdMock).not.toHaveBeenCalled()
  })

  it('shows a toast and skips API call when category is missing', async () => {
    await mountView('')

    expect(showErrorToastMock).toHaveBeenCalledWith('Genre not specified')
    expect(libraryFetchMock).not.toHaveBeenCalled()
  })

  it('shows backend string errors from the API response', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref('backend unavailable'),
      data: ref(null),
    })

    await mountView('rock')

    expect(showErrorToastMock).toHaveBeenCalledWith('Failed to load albums: backend unavailable')
  })

  it('normalizes non-string backend errors', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref({ code: 'E_FAIL' }),
      data: ref(null),
    })

    await mountView('rock')

    expect(showErrorToastMock).toHaveBeenCalledWith('Failed to load albums: Unknown error')
  })

  it('keeps albums empty when response has no albums array and no error', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref(null),
      data: ref({}),
    })

    const { wrapper } = await mountView('ambient')

    expect(wrapper.vm.albums).toEqual([])
    expect(showErrorToastMock).not.toHaveBeenCalled()
  })

  it('navigates to album details with genres query when PosterGrid emits click', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref(null),
      data: ref({
        albums: [
          {
            id: 'album42',
            name: 'Clicked Album',
            artists: ['Artist'],
            release_date: '2024-01-01',
          },
        ],
      }),
    })

    const { wrapper, router } = await mountView('pop')

    await wrapper.find('[data-testid="poster-click"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('album')
    expect(router.currentRoute.value.params.albumId).toBe('album42')
    expect(router.currentRoute.value.query.from).toBe('genres')
  })

  it('updates loading and loaded props around an in-flight fetch', async () => {
    let resolveJson: ((value: { error: ReturnType<typeof ref>; data: ReturnType<typeof ref> }) => void) | undefined

    fetchJsonMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveJson = resolve
        }),
    )

    const router = createRouterForTest()
    router.push({ name: 'albums-by-genre', params: { category: 'downtempo' } })
    await router.isReady()

    const wrapper = mount(AlbumsByGenre, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.poster-grid').attributes('data-loading')).toBe('true')
    expect(wrapper.find('.poster-grid').attributes('data-loaded')).toBe('false')

    resolveJson?.({
      error: ref(null),
      data: ref({ albums: [] }),
    })

    await flushPromises()

    expect(wrapper.find('.poster-grid').attributes('data-loading')).toBe('false')
    expect(wrapper.find('.poster-grid').attributes('data-loaded')).toBe('true')
  })

  it('handles unexpected fetch failures with generic toast', async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error('network down'))

    await mountView('soul')

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading albums by genre')
    expect(showErrorToastMock).toHaveBeenCalledWith('An error occurred while loading albums')
  })
})
