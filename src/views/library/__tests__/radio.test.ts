import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'

import RadioView from '../radio.vue'

const searchResults = ref<Array<Record<string, unknown>>>([])
const loading = ref(false)
const favoritesList = ref<Array<Record<string, unknown>>>([])
const hasFavorites = computed(() => favoritesList.value.length > 0)

const search = vi.fn(async () => undefined)
const clearSearchResults = vi.fn()
const playStation = vi.fn(async () => undefined)
const toggleFavorite = vi.fn()
const removeFromFavorites = vi.fn()
const editFavorite = vi.fn()
const initialize = vi.fn(async () => undefined)

vi.mock('@/stores/radio', () => ({
  useRadioStore: () => ({
    searchResults,
    loading,
    favoritesList,
    hasFavorites,
    search,
    clearSearchResults,
    playStation,
    toggleFavorite,
    removeFromFavorites,
    editFavorite,
    initialize,
  }),
}))

const PageContentStub = defineComponent({
  name: 'PageContent',
  setup(_, { slots }) {
    return () => h('section', { class: 'page-content' }, slots.default?.())
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

const CustomMarqueeStub = defineComponent({
  name: 'CustomMarquee',
  setup(_, { slots }) {
    return () => h('span', { class: 'marquee-stub' }, slots.default?.())
  },
})

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
        class: 'search-input',
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
        onChange: (event: Event) => emit('change', (event.target as HTMLInputElement).value),
      })
  },
})

const RadioEditPopupStub = defineComponent({
  name: 'RadioEditPopup',
  props: {
    isVisible: {
      type: Boolean,
      default: false,
    },
    station: {
      type: Object,
      default: null,
    },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    return () =>
      props.isVisible
        ? h('div', { class: 'radio-edit-popup' }, [
            h(
              'button',
              {
                class: 'popup-save',
                onClick: () => emit('save', props.station),
              },
              'save',
            ),
            h(
              'button',
              {
                class: 'popup-close',
                onClick: () => emit('close'),
              },
              'close',
            ),
          ])
        : h('div', { class: 'radio-edit-popup-hidden' })
  },
})

const createWrapper = () => {
  return mount(RadioView, {
    global: {
      stubs: {
        PageContent: PageContentStub,
        Icon: IconStub,
        CustomSearchField: CustomSearchFieldStub,
        CustomMarquee: CustomMarqueeStub,
        RadioEditPopup: RadioEditPopupStub,
      },
    },
  })
}

describe('library/radio.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()

    searchResults.value = []
    loading.value = false
    favoritesList.value = [
      {
        id: 'fav-1',
        title: 'Favorite One',
        url: 'https://radio.example/fav',
        metadata: {
          country: 'SE',
          tags: 'jazz, , fusion, live, extra',
          logo_url: 'https://img.example/fav.png',
        },
        img: 'https://img.example/fallback.png',
      },
    ]

    initialize.mockResolvedValue(undefined)
    search.mockResolvedValue(undefined)
    playStation.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('unit coverage', () => {
    it('initializes radio store on mount', async () => {
      createWrapper()
      await flushPromises()

      expect(initialize).toHaveBeenCalledTimes(1)
    })

    it('handles initialize rejection without crashing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      initialize.mockRejectedValueOnce(new Error('init failed'))

      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('runs station search when query is non-empty', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('input.search-input')

      await input.setValue('nordic')
      await flushPromises()

      expect(search).toHaveBeenCalledWith('nordic')
      expect(wrapper.text()).toContain('Search Results')
    })

    it('clears search results when query is empty', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('input.search-input')

      await input.setValue('test')
      await flushPromises()

      await input.setValue('')
      await flushPromises()

      expect(clearSearchResults).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).not.toContain('Search Results')
    })

    it('removes favorite on action button click without triggering playback', async () => {
      const wrapper = createWrapper()
      const removeButton = wrapper.find('.favorites-section .favorite-btn.active')

      await removeButton.trigger('click')
      await flushPromises()

      expect(removeFromFavorites).toHaveBeenCalledWith('fav-1')
      expect(playStation).not.toHaveBeenCalled()
    })

    it('toggles search-result favorite without triggering playback', async () => {
      favoritesList.value = []
      searchResults.value = [
        {
          id: 'station-1',
          name: 'Station One',
          country: 'NO',
          tags: 'ambient',
          image: '',
          isFavorite: false,
          url: 'https://radio.example/station',
        },
      ]

      const wrapper = createWrapper()
      const input = wrapper.find('input.search-input')
      await input.setValue('station')
      await flushPromises()

      const toggleButton = wrapper.find('.search-results-section .favorite-btn')
      await toggleButton.trigger('click')
      await flushPromises()

      expect(toggleFavorite).toHaveBeenCalledTimes(1)
      expect(playStation).not.toHaveBeenCalled()
    })

    it('limits visible station tags to three non-empty values', async () => {
      const wrapper = createWrapper()

      const tags = wrapper.findAll('.favorites-section .station-tags .tag')
      expect(tags).toHaveLength(3)
      expect(tags[0].text()).toBe('jazz')
      expect(tags[1].text()).toBe('fusion')
      expect(tags[2].text()).toBe('live')
    })
  })

  describe('regression coverage', () => {
    it('suppresses playback after long press and opens edit popup', async () => {
      vi.useFakeTimers()
      const wrapper = createWrapper()
      const favoritePoster = wrapper.find('.favorites-section .station-poster.favorite')

      await favoritePoster.trigger('mousedown')
      vi.advanceTimersByTime(510)
      await flushPromises()

      expect(wrapper.find('.radio-edit-popup').exists()).toBe(true)

      await favoritePoster.trigger('click')
      await flushPromises()

      expect(playStation).not.toHaveBeenCalled()
    })

    it('saves edited station through popup and closes editor state', async () => {
      vi.useFakeTimers()
      const wrapper = createWrapper()
      const favoritePoster = wrapper.find('.favorites-section .station-poster.favorite')

      await favoritePoster.trigger('mousedown')
      vi.advanceTimersByTime(510)
      await flushPromises()

      const popup = wrapper.find('.radio-edit-popup')
      expect(popup.exists()).toBe(true)

      await popup.find('button.popup-save').trigger('click')
      await flushPromises()

      expect(editFavorite).toHaveBeenCalledWith(favoritesList.value[0])
      expect(wrapper.find('.radio-edit-popup').exists()).toBe(false)
    })
  })
})
