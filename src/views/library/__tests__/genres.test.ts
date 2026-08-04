import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

import GenresView from '../genres.vue'

const showErrorToastMock = vi.fn()
const getAvailableLibraryMock = vi.fn()
const libraryFetchMock = vi.fn()
const fetchJsonMock = vi.fn()

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: showErrorToastMock,
  }),
}))

vi.mock('@/stores/library.ts', () => ({
  useLibraryStore: () => ({
    getAvailableLibrary: getAvailableLibraryMock,
  }),
}))

vi.mock('@/composables/useLibraryFetch.ts', () => ({
  useLibraryFetch: () => libraryFetchMock,
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template: '<section><h1>{{ title }}</h1><slot /></section>',
  },
}))

vi.mock('@/components/skeletons/PosterSkeleton.vue', () => ({
  default: {
    name: 'PosterSkeleton',
    template: '<div data-testid="poster-skeleton">loading</div>',
    props: ['posterForm', 'isNote'],
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<span data-testid="icon" />',
    props: ['icon'],
  },
}))

describe('genres.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())

    getAvailableLibraryMock.mockResolvedValue('main')
    fetchJsonMock.mockResolvedValue({
      error: ref(null),
      data: ref({ categories: ['Rock', 'Jazz'] }),
    })
    libraryFetchMock.mockReturnValue({ json: fetchJsonMock })
  })

  const createWrapper = async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/library',
          name: 'library',
          component: { template: '<div>Library</div>' },
        },
        {
          path: '/library/genres/:category',
          name: 'albums-by-genre',
          component: { template: '<div>Genre Albums</div>' },
        },
      ],
    })

    router.push({ name: 'library' })
    await router.isReady()

    const wrapper = mount(GenresView, {
      global: {
        plugins: [router],
      },
    })

    return { wrapper, router }
  }

  it('loads genres on mount and renders fetched items', async () => {
    const { wrapper } = await createWrapper()
    await flushPromises()

    expect(getAvailableLibraryMock).toHaveBeenCalledTimes(1)
    expect(libraryFetchMock).toHaveBeenCalledWith('/library/:activeLibrary/categories')
    expect(wrapper.findAll('.poster-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Rock')
    expect(wrapper.text()).toContain('Jazz')
    expect(wrapper.find('[data-testid="poster-skeleton"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No genres found.')
  })

  it('calls getAvailableLibrary before genres request', async () => {
    const { wrapper } = await createWrapper()
    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    expect(getAvailableLibraryMock.mock.invocationCallOrder[0]).toBeLessThan(
      libraryFetchMock.mock.invocationCallOrder[0],
    )
  })

  it('shows loading skeleton while genres request is pending', async () => {
    let resolveJson: ((value: { error: ReturnType<typeof ref>; data: ReturnType<typeof ref> }) => void) | undefined

    fetchJsonMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveJson = resolve
        }),
    )

    const { wrapper } = await createWrapper()

    expect(wrapper.find('[data-testid="poster-skeleton"]').exists()).toBe(true)

    resolveJson?.({
      error: ref(null),
      data: ref({ categories: [] }),
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="poster-skeleton"]').exists()).toBe(false)
  })

  it('navigates to albums-by-genre when a genre card is clicked', async () => {
    const { wrapper, router } = await createWrapper()
    await flushPromises()

    const cards = wrapper.findAll('.poster-item')
    expect(cards).toHaveLength(2)

    await cards[0].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('albums-by-genre')
    expect(router.currentRoute.value.params.category).toBe('Rock')
  })

  it('renders empty-state copy when API returns no genres', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref(null),
      data: ref({ categories: [] }),
    })

    const { wrapper } = await createWrapper()
    await flushPromises()

    expect(wrapper.findAll('.poster-item')).toHaveLength(0)
    expect(wrapper.text()).toContain('No genres found. Add genre mappings to create genres.')
  })

  it('shows API error toast and leaves empty state visible', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref('backend unavailable'),
      data: ref(null),
    })

    const { wrapper } = await createWrapper()
    await flushPromises()

    expect(showErrorToastMock).toHaveBeenCalledWith(
      'Failed to load genres: backend unavailable',
    )
    expect(wrapper.findAll('.poster-item')).toHaveLength(0)
    expect(wrapper.text()).toContain('No genres found. Add genre mappings to create genres.')
  })

  it('normalizes non-string API errors', async () => {
    fetchJsonMock.mockResolvedValueOnce({
      error: ref({ code: 'E_FAIL' }),
      data: ref(null),
    })

    await createWrapper()
    await flushPromises()

    expect(showErrorToastMock).toHaveBeenCalledWith('Failed to load genres: Unknown error')
  })

  it('handles thrown errors and clears loading state', async () => {
    getAvailableLibraryMock.mockRejectedValueOnce(new Error('library unavailable'))

    const { wrapper } = await createWrapper()
    await flushPromises()

    expect(showErrorToastMock).toHaveBeenCalledWith('An error occurred while loading genres')
    expect(wrapper.find('[data-testid="poster-skeleton"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('No genres found. Add genre mappings to create genres.')
  })

  it('handles thrown fetch errors and clears loading state', async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error('network down'))

    const { wrapper } = await createWrapper()
    await flushPromises()

    expect(showErrorToastMock).toHaveBeenCalledWith('An error occurred while loading genres')
    expect(wrapper.find('[data-testid="poster-skeleton"]').exists()).toBe(false)
  })
})
