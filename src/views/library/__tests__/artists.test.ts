import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h, ref } from 'vue'
import ArtistsView from '../artists.vue'

const loading = ref(false)
const loaded = ref(false)
const sortedArtists = ref<Array<{ id?: string; $id?: string; name: string }>>([])

const getArtists = vi.fn()
const setSearchQuery = vi.fn()
const clearSearch = vi.fn()

vi.mock('@/stores/artist.ts', () => ({
  useArtistStore: () => ({
    loading,
    loaded,
    sortedArtists,
    getArtists,
    setSearchQuery,
    clearSearch,
  }),
}))

const CustomSearchFieldStub = defineComponent({
  name: 'CustomSearchField',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        class: 'custom-search-field',
        value: props.modelValue,
        onInput: (event: Event) => {
          const value = (event.target as HTMLInputElement).value
          emit('update:modelValue', value)
          emit('change', value)
        },
      })
  },
})

const PosterGridStub = defineComponent({
  name: 'PosterGrid',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        class: 'poster-grid-click',
        onClick: () => emit('click', props.items[0]),
      })
  },
})

const AlphabetIndexStub = defineComponent({
  name: 'AlphabetIndex',
  emits: ['letter-click'],
  setup(_, { emit }) {
    return () =>
      h('div', [
        h(
          'button',
          {
            class: 'letter-hash',
            onClick: () => emit('letter-click', '#'),
          },
          '#',
        ),
        h(
          'button',
          {
            class: 'letter-a',
            onClick: () => emit('letter-click', 'A'),
          },
          'A',
        ),
      ])
  },
})

const PageContentStub = defineComponent({
  name: 'PageContent',
  setup(_, { slots }) {
    return () => h('div', { class: 'page-content' }, slots.default?.())
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
        path: '/library/artist/:artistId',
        name: 'artist-album',
        component: { template: '<div>Artist Album</div>' },
      },
    ],
  })

  await router.push({ name: 'library' })
  await router.isReady()

  const wrapper = mount(ArtistsView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        PageContent: PageContentStub,
        CustomSearchField: CustomSearchFieldStub,
        PosterGrid: PosterGridStub,
        AlphabetIndex: AlphabetIndexStub,
      },
    },
  })

  return { wrapper, router }
}

describe('artists.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loading.value = false
    loaded.value = false
    sortedArtists.value = []
  })

  describe('unit coverage', () => {
    it('loads artists and clears stale search state on mount', async () => {
      await createWrapper()

      expect(getArtists).toHaveBeenCalledTimes(1)
      expect(clearSearch).toHaveBeenCalledTimes(1)
    })

    it('forwards search updates to the artist store', async () => {
      const { wrapper } = await createWrapper()

      const input = wrapper.find('input.custom-search-field')
      await input.setValue('Nils Frahm')

      expect(setSearchQuery).toHaveBeenCalledWith('Nils Frahm')
    })

    it('renders artists wrapper class used by scoped styles', async () => {
      const { wrapper } = await createWrapper()

      expect(wrapper.find('.artists').exists()).toBe(true)
      expect(wrapper.find('.artists .breadcrumbs').exists()).toBe(true)
    })

    it('navigates with semantic id when a poster item is clicked', async () => {
      sortedArtists.value = [{ id: 'artist-10', $id: 'mapped-10', name: 'Artist 10' }]
      const { wrapper, router } = await createWrapper()

      await wrapper.find('button.poster-grid-click').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('artist-album')
      expect(router.currentRoute.value.params.artistId).toBe('artist-10')
    })

    it('falls back to mapped $id when semantic id is missing', async () => {
      sortedArtists.value = [{ $id: 'mapped-only-1', name: 'Mapped Artist' }]
      const { wrapper, router } = await createWrapper()

      await wrapper.find('button.poster-grid-click').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('artist-album')
      expect(router.currentRoute.value.params.artistId).toBe('mapped-only-1')
    })

    it('does not navigate when both id and $id are missing', async () => {
      sortedArtists.value = [{ name: 'No ID Artist' }]
      const { wrapper, router } = await createWrapper()

      const initialName = router.currentRoute.value.name
      await wrapper.find('button.poster-grid-click').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe(initialName)
    })
  })

  describe('regression coverage', () => {
    it('scrolls to numeric artist target for # index using mapped id', async () => {
      sortedArtists.value = [{ $id: 'mapped-42', name: '2 Unlimited' }]
      const scrollIntoView = vi.fn()
      const wrapperElement = {
        querySelector: vi.fn().mockReturnValue({ scrollIntoView }),
      } as unknown as Element
      const { wrapper } = await createWrapper()
      const originalQuerySelector = document.querySelector.bind(document)
      const querySpy = vi.spyOn(document, 'querySelector').mockImplementation((selectors: string) => {
        if (selectors === '[data-id="mapped-42"]') {
          return wrapperElement
        }
        return originalQuerySelector(selectors)
      })

      await wrapper.find('button.letter-hash').trigger('click')

      expect(querySpy).toHaveBeenCalledWith('[data-id="mapped-42"]')
      expect(scrollIntoView).toHaveBeenCalledTimes(1)

      querySpy.mockRestore()
    })

    it('scrolls to top for # index when there are no numeric artists', async () => {
      sortedArtists.value = [{ id: 'artist-a', name: 'Alpha Artist' }]
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)

      const { wrapper } = await createWrapper()
      await wrapper.find('button.letter-hash').trigger('click')

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      scrollToSpy.mockRestore()
    })

    it('scrolls to first matching letter target for alphabet index', async () => {
      sortedArtists.value = [
        { id: 'artist-b', name: 'Beta Artist' },
        { id: 'artist-a', name: 'Alpha Artist' },
      ]
      const scrollIntoView = vi.fn()
      const wrapperElement = {
        querySelector: vi.fn().mockReturnValue({ scrollIntoView }),
      } as unknown as Element
      const { wrapper } = await createWrapper()
      const originalQuerySelector = document.querySelector.bind(document)
      const querySpy = vi.spyOn(document, 'querySelector').mockImplementation((selectors: string) => {
        if (selectors === '[data-id="artist-a"]') {
          return wrapperElement
        }
        return originalQuerySelector(selectors)
      })

      await wrapper.find('button.letter-a').trigger('click')

      expect(querySpy).toHaveBeenCalledWith('[data-id="artist-a"]')
      expect(scrollIntoView).toHaveBeenCalledTimes(1)

      querySpy.mockRestore()
    })
  })
})
