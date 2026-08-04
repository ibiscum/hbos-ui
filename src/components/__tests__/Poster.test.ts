import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'

import Poster from '@/components/Poster.vue'

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

vi.mock('@/components/CustomMarquee.vue', () => ({
  default: {
    name: 'CustomMarquee',
    template: '<div class="custom-marquee-stub"><slot /></div>',
  },
}))

describe('Poster.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useImageMock.mockImplementation((imageOptions: { value: { src: string } }) => ({
      error: computed(() =>
        imageOptions.value.src === 'broken.jpg' ? new Error('failed to load image') : null,
      ),
    }))
  })

  it('renders image with text fields when source loads successfully', () => {
    const wrapper = mount(Poster, {
      props: {
        title: 'Kind of Blue',
        subtitle: 'Miles Davis',
        note: '1959',
        src: 'cover.jpg',
      },
    })

    const image = wrapper.find('img')
    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe('cover.jpg')
    expect(image.attributes('alt')).toBe('Kind of Blue')

    expect(wrapper.find('.poster-img').classes()).not.toContain('placeholder')
    expect(wrapper.find('.icon-stub').exists()).toBe(false)

    expect(wrapper.text()).toContain('Kind of Blue')
    expect(wrapper.text()).toContain('Miles Davis')
    expect(wrapper.text()).toContain('1959')
  })

  it('does not render note row when note is empty', () => {
    const wrapper = mount(Poster, {
      props: {
        title: 'Discovery',
        subtitle: 'Daft Punk',
        note: '',
        src: 'cover.jpg',
      },
    })

    expect(wrapper.find('.note').exists()).toBe(false)
  })

  it('regression: uses placeholder state when src is empty', () => {
    const wrapper = mount(Poster, {
      props: {
        title: 'No Cover Yet',
        subtitle: 'Unknown Artist',
        src: '',
      },
    })

    const imageContainer = wrapper.find('.poster-img')
    const placeholder = wrapper.find('.icon-stub')

    expect(imageContainer.classes()).toContain('placeholder')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.attributes('data-icon')).toBe('notebook-thin')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows square placeholder icon when image load fails', () => {
    const wrapper = mount(Poster, {
      props: {
        title: 'Broken Cover',
        subtitle: 'Unknown Artist',
        src: 'broken.jpg',
      },
    })

    const imageContainer = wrapper.find('.poster-img')
    const placeholder = wrapper.find('.icon-stub')

    expect(imageContainer.classes()).toContain('placeholder')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.attributes('data-icon')).toBe('notebook-thin')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows circle placeholder icon when posterForm is circle and image fails', () => {
    const wrapper = mount(Poster, {
      props: {
        title: 'Artist',
        subtitle: 'Top Tracks',
        src: 'broken.jpg',
        posterForm: 'circle',
      },
    })

    const imageContainer = wrapper.find('.poster-img')
    const placeholder = wrapper.find('.icon-stub')

    expect(imageContainer.classes()).toContain('circle')
    expect(imageContainer.classes()).toContain('placeholder')
    expect(placeholder.attributes('data-icon')).toBe('users-thin')
  })

  it('regression: reacts to src prop changes without remounting', async () => {
    const wrapper = mount(Poster, {
      props: {
        title: 'Mutable Cover',
        subtitle: 'Test Artist',
        src: 'first.jpg',
      },
    })

    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.find('.poster-img').classes()).not.toContain('placeholder')

    await wrapper.setProps({ src: 'broken.jpg' })
    await nextTick()

    expect(wrapper.find('.poster-img').classes()).toContain('placeholder')
    expect(wrapper.find('.icon-stub').attributes('data-icon')).toBe('notebook-thin')
    expect(wrapper.find('img').exists()).toBe(false)

    await wrapper.setProps({ src: 'restored.jpg' })
    await nextTick()

    const image = wrapper.find('img')
    expect(wrapper.find('.poster-img').classes()).not.toContain('placeholder')
    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe('restored.jpg')
  })

  it('passes image options and zero delay to useImage', () => {
    mount(Poster, {
      props: {
        src: 'cover.jpg',
      },
    })

    expect(useImageMock).toHaveBeenCalledTimes(1)
    const optionsRef = useImageMock.mock.calls[0]?.[0]
    const useImageOptions = useImageMock.mock.calls[0]?.[1]

    expect(optionsRef.value.src).toBe('cover.jpg')
    expect(useImageOptions).toEqual({ delay: 0 })
  })
})
