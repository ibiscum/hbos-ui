import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import CoverArtExample from '@/components/CoverArtExample.vue'
import type { Song } from '@/types/player'

const mockState = vi.hoisted(() => ({
  loadingRef: null as { value: boolean } | null,
  coverArtUrlsRef: null as { value: string[] } | null,
  sourceRef: null as { value: 'song' | 'album' | 'artist' | 'none' } | null,
  errorRef: null as { value: string | null } | null,
  loadCoverArtMock: vi.fn(),
  checkApiAvailabilityMock: vi.fn(),
  clearCoverArtMock: vi.fn(),
}))

vi.mock('@/composables/useCoverArt', async () => {
  const { ref, computed } = await import('vue')

  if (!mockState.loadingRef) mockState.loadingRef = ref(false)
  if (!mockState.coverArtUrlsRef) mockState.coverArtUrlsRef = ref<string[]>([])
  if (!mockState.sourceRef) mockState.sourceRef = ref<'song' | 'album' | 'artist' | 'none'>('none')
  if (!mockState.errorRef) mockState.errorRef = ref<string | null>(null)

  return {
    useCoverArt: () => ({
      loading: mockState.loadingRef,
      coverArtUrls: mockState.coverArtUrlsRef,
      hasCoverArt: computed(() => (mockState.coverArtUrlsRef?.value.length ?? 0) > 0),
      bestCoverArt: computed(() => mockState.coverArtUrlsRef?.value[0] ?? null),
      coverArtSource: mockState.sourceRef,
      error: mockState.errorRef,
      loadCoverArt: mockState.loadCoverArtMock,
      checkApiAvailability: mockState.checkApiAvailabilityMock,
      clearCoverArt: mockState.clearCoverArtMock,
    }),
  }
})

function getInputs(wrapper: ReturnType<typeof mount>) {
  const inputs = wrapper.findAll('input')
  return {
    titleInput: inputs[0],
    artistInput: inputs[1],
    albumInput: inputs[2],
  }
}

describe('CoverArtExample.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.loadingRef!.value = false
    mockState.coverArtUrlsRef!.value = []
    mockState.sourceRef!.value = 'none'
    mockState.errorRef!.value = null

    mockState.checkApiAvailabilityMock.mockResolvedValue(true)
    mockState.loadCoverArtMock.mockImplementation(async (_song: Song) => {
      mockState.coverArtUrlsRef!.value = ['https://img.example/primary.jpg']
      mockState.sourceRef!.value = 'song'
      return {
        success: true,
        urls: ['https://img.example/primary.jpg'],
        source: 'song',
      }
    })
    mockState.clearCoverArtMock.mockImplementation(() => {
      mockState.coverArtUrlsRef!.value = []
      mockState.sourceRef!.value = 'none'
      mockState.errorRef!.value = null
    })
  })

  it('renders default empty state', async () => {
    const wrapper = mount(CoverArtExample)
    await flushPromises()

    expect(wrapper.text()).toContain('No cover art found')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('checks API status on mount and shows online state', async () => {
    const wrapper = mount(CoverArtExample)
    await flushPromises()

    expect(mockState.checkApiAvailabilityMock).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.status.online').exists()).toBe(true)
    expect(wrapper.text()).toContain('API Available')
  })

  it('disables load button until required fields have non-whitespace values', async () => {
    const wrapper = mount(CoverArtExample)
    await flushPromises()

    const loadButton = wrapper.find('.button-group button')
    const { titleInput, artistInput } = getInputs(wrapper)

    expect(loadButton.attributes('disabled')).toBeDefined()

    await titleInput.setValue('   ')
    await artistInput.setValue('Artist Name')
    expect(loadButton.attributes('disabled')).toBeDefined()

    await titleInput.setValue('Song Name')
    expect(loadButton.attributes('disabled')).toBeUndefined()
  })

  it('loads cover art with normalized song values', async () => {
    const wrapper = mount(CoverArtExample)
    await flushPromises()

    const { titleInput, artistInput, albumInput } = getInputs(wrapper)
    await titleInput.setValue('  Test Title  ')
    await artistInput.setValue('  Test Artist  ')
    await albumInput.setValue('   ')

    await wrapper.find('.button-group button').trigger('click')
    await flushPromises()

    expect(mockState.loadCoverArtMock).toHaveBeenCalledTimes(1)
    expect(mockState.loadCoverArtMock).toHaveBeenCalledWith({
      title: 'Test Title',
      artist: 'Test Artist',
      album: undefined,
      duration: 0,
    })

    const image = wrapper.find('img.cover-image')
    expect(image.exists()).toBe(true)
    expect(image.attributes('alt')).toBe('Cover art for Test Title')
    expect(wrapper.text()).toContain('Source: song')
  })

  it('clears form and cover state when clear is clicked', async () => {
    const wrapper = mount(CoverArtExample)
    await flushPromises()

    const { titleInput, artistInput } = getInputs(wrapper)
    await titleInput.setValue('Some Song')
    await artistInput.setValue('Some Artist')

    await wrapper.find('.button-group button').trigger('click')
    await flushPromises()
    expect(wrapper.find('img').exists()).toBe(true)

    await wrapper.findAll('.button-group button')[1].trigger('click')
    await flushPromises()

    expect(mockState.clearCoverArtMock).toHaveBeenCalledTimes(1)
    expect((titleInput.element as HTMLInputElement).value).toBe('')
    expect((artistInput.element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('No cover art found')
  })

  it('loads sample values into all fields', async () => {
    const wrapper = mount(CoverArtExample)
    await flushPromises()

    await wrapper.findAll('.button-group button')[2].trigger('click')

    const { titleInput, artistInput, albumInput } = getInputs(wrapper)
    expect((titleInput.element as HTMLInputElement).value).toBe('Bohemian Rhapsody')
    expect((artistInput.element as HTMLInputElement).value).toBe('Queen')
    expect((albumInput.element as HTMLInputElement).value).toBe('A Night at the Opera')
  })

  it('renders all-urls list with secure external links when multiple URLs exist', async () => {
    mockState.coverArtUrlsRef!.value = [
      'https://img.example/one.jpg',
      'https://img.example/two.jpg',
    ]
    mockState.sourceRef!.value = 'album'

    const wrapper = mount(CoverArtExample)
    await flushPromises()

    const details = wrapper.find('details.all-urls')
    expect(details.exists()).toBe(true)
    expect(details.text()).toContain('All URLs (2)')

    const links = wrapper.findAll('details.all-urls a')
    expect(links).toHaveLength(2)
    expect(links[0].attributes('target')).toBe('_blank')
    expect(links[0].attributes('rel')).toBe('noopener noreferrer')
  })

  it('renders error state from composable', async () => {
    mockState.errorRef!.value = 'Backend unavailable'

    const wrapper = mount(CoverArtExample)
    await flushPromises()

    expect(wrapper.find('.error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error: Backend unavailable')
  })
})
