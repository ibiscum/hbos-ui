import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { RadioFavorite } from '@/stores/radio'

let mockShowErrorToast: ReturnType<typeof vi.fn>

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: mockShowErrorToast,
  }),
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    template: '<i data-test="icon" />',
    props: ['icon'],
  },
}))

import RadioEditPopup from '@/components/RadioEditPopup.vue'

const baseStation: RadioFavorite = {
  id: 'station-1',
  title: 'My Station',
  url: 'https://example.com/stream',
  metadata: {
    title: 'My Station',
    logo_url: 'https://example.com/logo.png',
    country: 'Germany',
    tags: 'rock,live',
  },
  img: 'https://example.com/legacy.png',
  country: 'DE',
  tags: 'legacy-tags',
}

const mountComponent = (overrides?: Partial<{ isVisible: boolean; station: RadioFavorite | null }>) => {
  return mount(RadioEditPopup, {
    props: {
      isVisible: true,
      station: baseStation,
      ...overrides,
    },
  })
}

describe('RadioEditPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockShowErrorToast = vi.fn()

    class MockFileReader {
      public onload: ((event: ProgressEvent<FileReader>) => void) | null = null

      readAsDataURL() {
        this.onload?.({
          target: { result: 'data:image/png;base64,mock-data' },
        } as unknown as ProgressEvent<FileReader>)
      }
    }

    vi.stubGlobal('FileReader', MockFileReader)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders when visible and pre-fills from metadata fields', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.radio-edit-popup-overlay').exists()).toBe(true)
    expect((wrapper.find('#station-name').element as HTMLInputElement).value).toBe('My Station')
    expect((wrapper.find('#station-country').element as HTMLInputElement).value).toBe('Germany')
    expect((wrapper.find('#station-tags').element as HTMLInputElement).value).toBe('rock,live')
    expect((wrapper.find('#station-url').element as HTMLInputElement).value).toBe(
      'https://example.com/stream'
    )
    expect(wrapper.find('.preview-image').attributes('src')).toBe('https://example.com/logo.png')
  })

  it('falls back to coverart_url then legacy img when metadata image variants are missing', async () => {
    const wrapper = mountComponent({
      station: {
        ...baseStation,
        metadata: {
          ...baseStation.metadata,
          logo_url: '',
          coverart_url: 'https://example.com/cover.png',
        },
        img: 'https://example.com/legacy-fallback.png',
      },
    })

    expect(wrapper.find('.preview-image').attributes('src')).toBe('https://example.com/cover.png')

    await wrapper.setProps({
      station: {
        ...baseStation,
        metadata: {
          ...baseStation.metadata,
          logo_url: '',
          coverart_url: '',
        },
        img: 'https://example.com/legacy-fallback.png',
      },
    })

    expect(wrapper.find('.preview-image').attributes('src')).toBe(
      'https://example.com/legacy-fallback.png'
    )
  })

  it('emits close when overlay is clicked', async () => {
    const wrapper = mountComponent()

    await wrapper.find('.radio-edit-popup-overlay').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits save with trimmed values and synchronized image metadata fields', async () => {
    const wrapper = mountComponent()

    await wrapper.find('#station-name').setValue('  Updated Station  ')
    await wrapper.find('#station-country').setValue('  Norway  ')
    await wrapper.find('#station-tags').setValue('  jazz,ambient  ')
    await wrapper.find('#station-url').setValue('  https://stream.updated  ')

    await wrapper.find('form').trigger('submit')

    const saveEvent = wrapper.emitted('save')
    expect(saveEvent).toBeTruthy()
    expect(saveEvent).toHaveLength(1)

    const payload = saveEvent?.[0]?.[0] as RadioFavorite
    expect(payload.title).toBe('Updated Station')
    expect(payload.url).toBe('https://stream.updated')
    expect(payload.metadata?.title).toBe('Updated Station')
    expect(payload.metadata?.country).toBe('Norway')
    expect(payload.metadata?.tags).toBe('jazz,ambient')
    expect(payload.metadata?.logo_url).toBe('https://example.com/logo.png')
    expect(payload.metadata?.coverart_url).toBe('https://example.com/logo.png')
    expect(payload.country).toBe('Norway')
    expect(payload.tags).toBe('jazz,ambient')
  })

  it('does not emit save and shows error when required values are empty after trimming', async () => {
    const wrapper = mountComponent()

    await wrapper.find('#station-name').setValue('   ')
    await wrapper.find('#station-url').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')).toBeFalsy()
    expect(mockShowErrorToast).toHaveBeenCalledWith('Station name and stream URL are required.')
  })

  it('resets draft state when popup closes and restores station values when reopened', async () => {
    const wrapper = mountComponent()

    await wrapper.find('#station-name').setValue('Temporary Draft')
    expect((wrapper.find('#station-name').element as HTMLInputElement).value).toBe('Temporary Draft')

    await wrapper.setProps({ isVisible: false })
    await nextTick()
    await wrapper.setProps({ isVisible: true, station: baseStation })
    await nextTick()

    expect((wrapper.find('#station-name').element as HTMLInputElement).value).toBe('My Station')
  })

  it('shows toast and does not update image when file exceeds max size', async () => {
    const wrapper = mountComponent()

    const fileInput = wrapper.find('input[type="file"]')
    const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], 'too-large.png', {
      type: 'image/png',
    })

    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [largeFile],
    })

    await fileInput.trigger('change')

    expect(mockShowErrorToast).toHaveBeenCalledWith('Image size must be less than 5MB.')
    expect(wrapper.find('.preview-image').attributes('src')).toBe('https://example.com/logo.png')
  })

  it('shows toast and does not update image when file type is invalid', async () => {
    const wrapper = mountComponent()

    const fileInput = wrapper.find('input[type="file"]')
    const textFile = new File(['plain text'], 'notes.txt', {
      type: 'text/plain',
    })

    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [textFile],
    })

    await fileInput.trigger('change')

    expect(mockShowErrorToast).toHaveBeenCalledWith('Please select a valid image file.')
    expect(wrapper.find('.preview-image').attributes('src')).toBe('https://example.com/logo.png')
  })

  it('updates preview image after successful image upload', async () => {
    const wrapper = mountComponent()

    const fileInput = wrapper.find('input[type="file"]')
    const imageFile = new File([new Uint8Array([1, 2, 3])], 'new-image.png', {
      type: 'image/png',
    })

    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [imageFile],
    })

    await fileInput.trigger('change')

    expect(wrapper.find('.preview-image').attributes('src')).toBe('data:image/png;base64,mock-data')
  })
})
