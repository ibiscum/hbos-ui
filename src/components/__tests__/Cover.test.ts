import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'

import Cover from '@/components/Cover.vue'

const { useImageMock } = vi.hoisted(() => ({
  useImageMock: vi.fn(),
}))

vi.mock('@vueuse/core', () => ({
  useImage: useImageMock,
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<svg class="icon-stub" :data-icon="icon" />',
  },
}))

describe('Cover.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useImageMock.mockImplementation((imageOptions: { value: { src: string } }) => {
      const isLoading = computed(() => imageOptions.value.src === 'loading.jpg')
      const error = computed(() =>
        imageOptions.value.src === 'broken.jpg' ? new Error('failed to load image') : null
      )

      return { isLoading, error }
    })
  })

  it('regression: shows placeholder state when src is empty', () => {
    const wrapper = mount(Cover)

    expect(wrapper.find('.app-cover').classes()).toContain('no-img')
    expect(wrapper.find('.app-cover__placeholder-icon').exists()).toBe(true)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders image when src is present and loading succeeds', () => {
    const wrapper = mount(Cover, {
      props: {
        src: 'cover.jpg',
        alt: 'Album cover',
      },
    })

    const image = wrapper.find('img')
    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe('cover.jpg')
    expect(image.attributes('alt')).toBe('Album cover')
    expect(wrapper.find('.app-cover').classes()).not.toContain('no-img')
    expect(wrapper.find('.app-cover__placeholder-icon').exists()).toBe(false)
  })

  it('renders loading placeholder icon while image is loading', () => {
    const wrapper = mount(Cover, {
      props: {
        src: 'loading.jpg',
      },
    })

    const placeholder = wrapper.find('.app-cover__placeholder-icon')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.attributes('data-icon')).toBe('loading')
    expect(wrapper.find('.app-cover').classes()).toContain('no-img')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders error placeholder icon when image load fails', () => {
    const wrapper = mount(Cover, {
      props: {
        src: 'broken.jpg',
      },
    })

    const placeholder = wrapper.find('.app-cover__placeholder-icon')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.attributes('data-icon')).toBe('music')
    expect(wrapper.find('.app-cover').classes()).toContain('no-img')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('updates rendered image when src prop changes', async () => {
    const wrapper = mount(Cover, {
      props: {
        src: 'first.jpg',
      },
    })

    expect(wrapper.find('img').attributes('src')).toBe('first.jpg')

    await wrapper.setProps({ src: 'second.jpg' })
    await nextTick()

    expect(wrapper.find('img').attributes('src')).toBe('second.jpg')
  })

  it('passes delay option to useImage', () => {
    mount(Cover, {
      props: {
        src: 'cover.jpg',
        delay: 150,
      },
    })

    expect(useImageMock).toHaveBeenCalledTimes(1)
    expect(useImageMock.mock.calls[0]?.[1]).toEqual({ delay: 150 })
  })
})
