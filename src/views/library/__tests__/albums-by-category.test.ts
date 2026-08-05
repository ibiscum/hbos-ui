import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

import AlbumsByCategory from '../albums-by-category.vue'

const mockState = vi.hoisted(() => ({
  libraryFetchMock: vi.fn(),
  fetchJsonMock: vi.fn(),
  showErrorToastMock: vi.fn(),
  getAlbumCoverByIdMock: vi.fn((id: string) => `cover-${id}.jpg`),
}))

vi.mock('@/composables/useLibraryFetch.ts', () => ({
  useLibraryFetch: () => mockState.libraryFetchMock,
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: mockState.showErrorToastMock,
  }),
}))

vi.mock('@/stores/album.ts', () => ({
  useAlbumStore: () => ({
    getAlbumCoverById: mockState.getAlbumCoverByIdMock,
  }),
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template: `
      <div class="page-content" :data-title="title">
        <slot />
      </div>
    `,
  },
}))

vi.mock('@/components/PosterGrid.vue', () => ({
  default: {
    name: 'PosterGrid',
    props: ['loading', 'loaded', 'items'],
    emits: ['click'],
    template: `
      <div
        class="poster-grid"
        :data-loading="String(loading)"
        :data-loaded="String(loaded)"
        :data-items="items.length"
      />
    `,
  },
}))

type RouterBundle = {
  wrapper: ReturnType<typeof mount>
  router: ReturnType<typeof createRouter>
}

const createWrapper = async (category?: string): Promise<RouterBundle> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/library/categories/:category?',
        name: 'albums-by-category',
        component: AlbumsByCategory,
      },
      {
        path: '/library/categories',
        name: 'categories',
        component: { template: '<div>categories</div>' },
      },
      {
        path: '/library/album/:albumId',
        name: 'album',
        component: { template: '<div>album</div>' },
      },
    ],
  })

  if (category === undefined) {
    await router.push({ name: 'albums-by-category' })
  } else {
    await router.push({ name: 'albums-by-category', params: { category } })
  }
  await router.isReady()

  const wrapper = mount(AlbumsByCategory, {
    global: {
      plugins: [createPinia(), router],
    },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('albums-by-category view', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockState.fetchJsonMock.mockResolvedValue({
      error: ref(null),
      data: ref({ albums: [] }),
    })

    mockState.libraryFetchMock.mockImplementation(() => ({
      json: mockState.fetchJsonMock,
    }))
  })

  it('loads albums on mount and passes mapped items to PosterGrid', async () => {
    mockState.fetchJsonMock.mockResolvedValueOnce({
      error: ref(null),
      data: ref({
        albums: [
          {
            id: 'album-1',
            name: 'Alpha Album',
            artists: ['Artist A'],
            release_date: '2023-09-01',
          },
          {
            id: 'album-2',
            name: 'Beta Album',
            artists: [],
          },
        ],
      }),
    })

    const { wrapper } = await createWrapper('Rock & Roll')

    expect(mockState.libraryFetchMock).toHaveBeenCalledWith(
      '/library/:activeLibrary/albums/by-category/Rock%20%26%20Roll',
    )

    const posterGrid = wrapper.getComponent({ name: 'PosterGrid' })
    expect(posterGrid.attributes('data-loading')).toBe('false')
    expect(posterGrid.attributes('data-loaded')).toBe('true')
    expect(posterGrid.attributes('data-items')).toBe('2')

    const vm = wrapper.vm as any
    expect(vm.albumItems[0]).toEqual({
      $id: 'album-1',
      $title: 'Alpha Album',
      $subtitle: 'Artist A',
      $note: '2023',
      $cover_src: 'cover-album-1.jpg',
    })
    expect(vm.albumItems[1].$subtitle).toBe('')
    expect(vm.albumItems[1].$note).toBe('')
  })

  it('warns and shows validation fallback when album data is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockState.fetchJsonMock.mockResolvedValueOnce({
      error: ref(null),
      data: ref({
        albums: [
          {
            id: '',
            name: '',
            artists: ['Artist A'],
          },
        ],
      }),
    })

    const { wrapper } = await createWrapper('broken')
    const vm = wrapper.vm as any

    expect(vm.albumItems[0]).toEqual({
      $id: '',
      $title: '',
      $subtitle: '',
      $note: '',
      $cover_src: '',
    })
    expect(warnSpy).toHaveBeenCalledWith('Invalid album data:', {
      id: '',
      name: '',
      artists: ['Artist A'],
    })

    warnSpy.mockRestore()
  })

  it('shows category-missing warning and toast without fetching', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { wrapper } = await createWrapper(undefined)

    expect(mockState.libraryFetchMock).not.toHaveBeenCalled()
    expect(mockState.showErrorToastMock).toHaveBeenCalledWith('Category not specified')
    expect(warnSpy).toHaveBeenCalledWith('Category parameter missing from route')

    const posterGrid = wrapper.getComponent({ name: 'PosterGrid' })
    expect(posterGrid.attributes('data-loading')).toBe('false')
    expect(posterGrid.attributes('data-loaded')).toBe('true')

    warnSpy.mockRestore()
  })

  it('shows API error toast for string errors', async () => {
    mockState.fetchJsonMock.mockResolvedValueOnce({
      error: ref('backend unavailable'),
      data: ref(null),
    })

    const { wrapper } = await createWrapper('jazz')

    expect(mockState.showErrorToastMock).toHaveBeenCalledWith(
      'Failed to load albums: backend unavailable',
    )

    const posterGrid = wrapper.getComponent({ name: 'PosterGrid' })
    expect(posterGrid.attributes('data-items')).toBe('0')
    expect(posterGrid.attributes('data-loaded')).toBe('true')
  })

  it('normalizes non-string API errors to Unknown error', async () => {
    mockState.fetchJsonMock.mockResolvedValueOnce({
      error: ref({ code: 'E_FAIL' }),
      data: ref(null),
    })

    await createWrapper('electronic')

    expect(mockState.showErrorToastMock).toHaveBeenCalledWith(
      'Failed to load albums: Unknown error',
    )
  })

  it('handles thrown fetch errors via onMounted catch and reports generic toast', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockState.fetchJsonMock.mockRejectedValueOnce(new Error('network down'))

    const { wrapper } = await createWrapper('ambient')

    expect(errorSpy).toHaveBeenCalledWith('Error loading albums by category')
    expect(mockState.showErrorToastMock).toHaveBeenCalledWith(
      'An error occurred while loading albums',
    )

    const posterGrid = wrapper.getComponent({ name: 'PosterGrid' })
    expect(posterGrid.attributes('data-loading')).toBe('true')
    expect(posterGrid.attributes('data-loaded')).toBe('false')

    errorSpy.mockRestore()
  })

  it('navigates to album view with source query when PosterGrid emits click', async () => {
    mockState.fetchJsonMock.mockResolvedValueOnce({
      error: ref(null),
      data: ref({
        albums: [
          {
            id: 'album-7',
            name: 'Seventh Album',
            artists: ['Artist 7'],
            release_date: '2020-01-01',
          },
        ],
      }),
    })

    const { wrapper, router } = await createWrapper('indie')
    const posterGrid = wrapper.getComponent({ name: 'PosterGrid' })

    await posterGrid.vm.$emit('click', { $id: 'album-7' })
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('album')
    expect(router.currentRoute.value.params.albumId).toBe('album-7')
    expect(router.currentRoute.value.query.from).toBe('categories')
  })
})
