import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref, type Ref } from 'vue'

import ArtistAlbum from '../artist-album.vue'
import { updateArtistImage } from '@/api/coverart'
import { rewriteImageUrl } from '@/api/utils'

interface ArtistLike {
  id: string
  name: string
  thumb_url?: string[]
  metadata?: {
    mbid?: string[]
    biography?: string
    genres?: string[]
  }
}

const runtime = vi.hoisted(() => {
  return {
    loading: null as unknown as Ref<boolean>,
    loaded: null as unknown as Ref<boolean>,
    sortedAlbumsByReleaseDate: null as unknown as Ref<Array<{ id: string }>>,

    allArtists: null as unknown as Ref<ArtistLike[]>,
    fullArtistData: null as unknown as Ref<ArtistLike | null>,
    basicArtist: null as unknown as Ref<ArtistLike | null>,

    mbArtistData: null as unknown as Ref<Record<string, unknown> | null>,
    mbLoading: null as unknown as Ref<boolean>,
    mbError: null as unknown as Ref<string | null>,
    formattedLifeSpan: null as unknown as Ref<string>,
    formattedLocation: null as unknown as Ref<string>,

    getAlbumByArtistId: vi.fn(),
    getArtists: vi.fn(async () => undefined),
    getArtistByIdFromStore: vi.fn(() => null as ArtistLike | null),

    libraryFetchImpl: vi.fn(),
    fetchMbArtist: vi.fn(async () => undefined),

    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
    showInfoToast: vi.fn(),
  }
})

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()
  return {
    ...actual,
    storeToRefs: <T extends object>(store: T): T => store,
  }
})

vi.mock('@/stores/album', () => ({
  useAlbumStore: () => ({
    loading: runtime.loading,
    loaded: runtime.loaded,
    sortedAlbumsByReleaseDate: runtime.sortedAlbumsByReleaseDate,
    getAlbumByArtistId: runtime.getAlbumByArtistId,
  }),
}))

vi.mock('@/stores/artist', () => ({
  useArtistStore: () => {
    const store = {
      allArtists: runtime.allArtists,
      getArtistByIdFromStore: runtime.getArtistByIdFromStore,
      getArtists: runtime.getArtists,
    } as {
      allArtists: Ref<ArtistLike[]>
      artistByName: Ref<ArtistLike | null>
      getArtistByIdFromStore: typeof runtime.getArtistByIdFromStore
      getArtists: typeof runtime.getArtists
    }

    Object.defineProperty(store, 'artistByName', {
      get: () => runtime.fullArtistData,
      set: (value: ArtistLike | null) => {
        runtime.fullArtistData.value = value
      },
      enumerable: true,
      configurable: true,
    })

    return store
  },
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    showErrorToast: runtime.showErrorToast,
    showSuccessToast: runtime.showSuccessToast,
    showInfoToast: runtime.showInfoToast,
  }),
}))

vi.mock('@/composables/useLibraryFetch', () => ({
  useLibraryFetch: () => runtime.libraryFetchImpl,
}))

vi.mock('@/composables/useMusicBrainz', () => ({
  useMusicBrainz: () => ({
    artistData: runtime.mbArtistData,
    loading: runtime.mbLoading,
    error: runtime.mbError,
    fetchArtist: runtime.fetchMbArtist,
    formattedLifeSpan: runtime.formattedLifeSpan,
    formattedLocation: runtime.formattedLocation,
  }),
}))

vi.mock('@/api/coverart', () => ({
  updateArtistImage: vi.fn(async () => ({ success: true, message: 'ok' })),
}))

vi.mock('@/api/utils', () => ({
  rewriteImageUrl: vi.fn((url: string) => `rewritten-${url}`),
}))

vi.mock('@/components/BackRouter.vue', () => ({
  default: {
    name: 'BackRouter',
    props: ['to'],
    template: '<div class="back-router-stub" :data-route="to?.name"><slot /></div>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/PosterGrid.vue', () => ({
  default: {
    name: 'PosterGrid',
    props: ['items', 'loading', 'loaded'],
    emits: ['click'],
    template: `
      <div class="poster-grid-stub" :data-loading="loading ? 'yes' : 'no'" :data-loaded="loaded ? 'yes' : 'no'">
        <button class="poster-click" @click="$emit('click', items[0] ?? { id: 'fallback-album' })">Open</button>
      </div>
    `,
  },
}))

vi.mock('@/components/ArtistImageSelector.vue', () => ({
  default: {
    name: 'ArtistImageSelector',
    props: ['isVisible', 'artistName'],
    emits: ['close', 'select'],
    template: `
      <div class="artist-image-selector-stub" :data-visible="isVisible ? 'yes' : 'no'" :data-artist="artistName">
        <button class="selector-close" @click="$emit('close')">Close</button>
        <button class="selector-select" @click="$emit('select', 'https://example.com/new.jpg')">Select</button>
      </div>
    `,
  },
}))

function baseArtist(): ArtistLike {
  return {
    id: 'artist1',
    name: 'Artist One',
    thumb_url: ['https://images.example/artist1.jpg'],
    metadata: {
      mbid: ['mbid-123'],
      biography: 'Short biography text',
      genres: ['Rock', 'rock', '  ', 'Alternative'],
    },
  }
}

function setLibraryFetchArtistResponse(artist: ArtistLike | null, hasError = false) {
  runtime.libraryFetchImpl.mockImplementation((url: string) => ({
    json: vi.fn(async () => ({
      error: { value: hasError },
      data: { value: artist ? { artist } : {} },
      url,
    })),
  }))
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/artists/:artistId', name: 'artist-album', component: ArtistAlbum },
      { path: '/album/:albumId', name: 'album', component: { template: '<div>Album</div>' } },
      { path: '/artists', name: 'artists', component: { template: '<div>Artists</div>' } },
    ],
  })
}

async function mountView(artistId = 'artist1') {
  const router = createTestRouter()
  await router.push({ name: 'artist-album', params: { artistId } })
  await router.isReady()

  const wrapper = mount(ArtistAlbum, {
    global: {
      plugins: [router, createPinia()],
    },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('artist-album.vue consolidated unit and regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    runtime.loading = ref(false)
    runtime.loaded = ref(true)
    runtime.sortedAlbumsByReleaseDate = ref([{ id: 'album-1' }])

    runtime.allArtists = ref([])
    runtime.fullArtistData = ref(baseArtist())
    runtime.basicArtist = ref(baseArtist())

    runtime.mbArtistData = ref(null)
    runtime.mbLoading = ref(false)
    runtime.mbError = ref(null)
    runtime.formattedLifeSpan = ref('1999 - present')
    runtime.formattedLocation = ref('Berlin, DE')

    runtime.getAlbumByArtistId.mockClear()
    runtime.getArtists.mockClear()
    runtime.getArtistByIdFromStore.mockImplementation(() => runtime.basicArtist.value)
    runtime.fetchMbArtist.mockClear()

    runtime.showErrorToast.mockClear()
    runtime.showSuccessToast.mockClear()
    runtime.showInfoToast.mockClear()

    runtime.libraryFetchImpl.mockReset()
    setLibraryFetchArtistResponse(baseArtist(), false)

    vi.mocked(updateArtistImage).mockReset()
    vi.mocked(updateArtistImage).mockResolvedValue({ success: true, message: 'Updated' })
    vi.mocked(rewriteImageUrl).mockClear()
  })

  it('loads artist/albums/metadata on mount and fetches MB artist when mbid exists', async () => {
    const { wrapper } = await mountView('artistX')

    expect(runtime.getArtists).toHaveBeenCalledTimes(1)
    expect(runtime.getAlbumByArtistId).toHaveBeenCalledWith('artistX')
    expect(runtime.libraryFetchImpl).toHaveBeenCalledWith('/library/:activeLibrary/artist/by-id/artistX')
    expect(runtime.fetchMbArtist).toHaveBeenCalledWith('mbid-123')
    expect(wrapper.find('.albums-section').exists()).toBe(true)
  })

  it('skips getArtists call when allArtists already loaded', async () => {
    runtime.allArtists.value = [baseArtist()]

    await mountView('artist1')

    expect(runtime.getArtists).not.toHaveBeenCalled()
    expect(runtime.getAlbumByArtistId).toHaveBeenCalledWith('artist1')
  })

  it('handles mount errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    runtime.getArtists.mockRejectedValueOnce(new Error('load fail'))

    await mountView('artist1')

    expect(consoleSpy).toHaveBeenCalledWith('Error loading artist data')
    consoleSpy.mockRestore()
  })

  it('renders fallback artist ID block when metadata sections are unavailable', async () => {
    runtime.fullArtistData.value = { id: 'artist1', name: 'Artist One' }
    runtime.basicArtist.value = { id: 'artist1', name: 'Artist One' }
    setLibraryFetchArtistResponse({ id: 'artist1', name: 'Artist One' }, false)

    const { wrapper } = await mountView('artist1')

    expect(wrapper.find('.artist-id').exists()).toBe(true)
    expect(wrapper.find('.id-value').text()).toBe('artist1')
  })

  it('renders loading and error variants for MusicBrainz section', async () => {
    runtime.mbLoading.value = true
    setLibraryFetchArtistResponse(baseArtist(), false)
    const { wrapper: loadingWrapper } = await mountView()
    expect(loadingWrapper.find('.mb-loading').exists()).toBe(true)

    runtime.mbLoading.value = false
    runtime.mbError.value = 'MusicBrainz unavailable'
    setLibraryFetchArtistResponse(baseArtist(), false)
    const { wrapper: errorWrapper } = await mountView()
    expect(errorWrapper.find('.mb-error').text()).toContain('MusicBrainz unavailable')
  })

  it('renders MB info table rows and unique genres list when data is available', async () => {
    runtime.mbArtistData.value = { id: 'mbid-123' }
    setLibraryFetchArtistResponse(baseArtist(), false)
    const { wrapper } = await mountView()

    const text = wrapper.text()
    expect(text).toContain('Active:')
    expect(text).toContain('1999 - present')
    expect(text).toContain('Location:')
    expect(text).toContain('Berlin, DE')
    expect(text).toContain('Genres:')
    expect(text).toContain('Rock, Alternative')
  })

  it('hides optional MB table rows when lifespan, location, and genres are absent', async () => {
    const artist = baseArtist()
    artist.metadata = { mbid: ['mbid-123'], genres: [] }
    runtime.fullArtistData.value = artist
    runtime.basicArtist.value = artist
    runtime.mbArtistData.value = { id: 'mbid-123' }
    runtime.formattedLifeSpan.value = ''
    runtime.formattedLocation.value = ''
    setLibraryFetchArtistResponse(artist, false)

    const { wrapper } = await mountView()

    expect(wrapper.text()).not.toContain('Active:')
    expect(wrapper.text()).not.toContain('Location:')
    expect(wrapper.text()).not.toContain('Genres:')
  })

  it('renders basic info path when metadata exists without mbid', async () => {
    const noMbidArtist = baseArtist()
    noMbidArtist.metadata = {
      biography: 'Some bio',
      genres: ['Jazz', 'jazz'],
    }
    runtime.fullArtistData.value = noMbidArtist
    runtime.basicArtist.value = noMbidArtist
    setLibraryFetchArtistResponse(noMbidArtist, false)

    const { wrapper } = await mountView()

    expect(wrapper.find('.artist-info-basic').exists()).toBe(true)
    expect(wrapper.text()).toContain('Genres:')
    expect(wrapper.text()).toContain('Jazz')
  })

  it('shows biography toggle in basic path for long biography and toggles expansion', async () => {
    const longBasicArtist = baseArtist()
    longBasicArtist.metadata = {
      biography: 'x'.repeat(430),
      genres: ['Ambient'],
    }
    runtime.fullArtistData.value = longBasicArtist
    runtime.basicArtist.value = longBasicArtist
    setLibraryFetchArtistResponse(longBasicArtist, false)

    const { wrapper } = await mountView()

    expect(wrapper.find('.artist-info-basic .biography-toggle').exists()).toBe(true)
    const truncated = wrapper.find('.artist-info-basic .biography-content p').text()
    expect(truncated.endsWith('...')).toBe(true)

    await wrapper.get('.artist-info-basic .biography-toggle').trigger('click')
    const expanded = wrapper.find('.artist-info-basic .biography-content p').text()
    expect(expanded.endsWith('...')).toBe(false)
  })

  it('computes rewritten image URL and falls back to placeholder after image error', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.find('.artist-img').attributes('src')).toBe('rewritten-https://images.example/artist1.jpg')
    expect(rewriteImageUrl).toHaveBeenCalledWith('https://images.example/artist1.jpg')

    await wrapper.get('.artist-img').trigger('error')
    await nextTick()

    expect(wrapper.find('.artist-img').exists()).toBe(false)
    expect(wrapper.find('.artist-img-placeholder').exists()).toBe(true)
  })

  it('resets image error state when artist id changes', async () => {
    const { wrapper } = await mountView()

    await wrapper.get('.artist-img').trigger('error')
    expect(wrapper.find('.artist-img-placeholder').exists()).toBe(true)

    runtime.basicArtist.value = { ...baseArtist(), id: 'artist2', thumb_url: ['https://images.example/artist2.jpg'] }
    await nextTick()

    expect(wrapper.find('.artist-img').exists()).toBe(true)
    expect(wrapper.find('.artist-img').attributes('src')).toContain('artist2.jpg')
  })

  it('toggles mobile and biography expand controls from UI buttons', async () => {
    const longBioArtist = baseArtist()
    longBioArtist.metadata = {
      ...longBioArtist.metadata,
      biography: 'a'.repeat(420),
    }
    runtime.fullArtistData.value = longBioArtist
    runtime.basicArtist.value = longBioArtist
    runtime.mbArtistData.value = { id: 'mbid-123' }
    setLibraryFetchArtistResponse(longBioArtist, false)

    const { wrapper } = await mountView()

    expect(wrapper.find('.mobile-toggle').exists()).toBe(true)
    await wrapper.get('.mobile-toggle').trigger('click')
    expect(wrapper.get('.mobile-toggle').classes()).toContain('active')

    expect(wrapper.find('.biography-toggle').exists()).toBe(true)
    const initialBio = wrapper.find('.biography-content p').text()
    expect(initialBio.endsWith('...')).toBe(true)

    await wrapper.get('.biography-toggle').trigger('click')
    const expandedBio = wrapper.find('.biography-content p').text()
    expect(expandedBio.endsWith('...')).toBe(false)
  })

  it('opens image selector from overlay and closes it via child close event', async () => {
    const { wrapper } = await mountView()

    await wrapper.get('.artist-img-container').trigger('mouseenter')
    await wrapper.get('.artist-img-edit-overlay').trigger('click')

    expect(wrapper.get('.artist-image-selector-stub').attributes('data-visible')).toBe('yes')

    await wrapper.get('.selector-close').trigger('click')

    expect(wrapper.get('.artist-image-selector-stub').attributes('data-visible')).toBe('no')

    await wrapper.get('.artist-img-container').trigger('mouseleave')
    expect(wrapper.vm.showEditIcon).toBe(false)
  })

  it('keeps full biography when truncation flag is true but biography is short (branch guard)', async () => {
    const shortBioArtist = baseArtist()
    shortBioArtist.metadata = {
      ...shortBioArtist.metadata,
      biography: 'compact bio',
    }
    runtime.fullArtistData.value = shortBioArtist
    runtime.basicArtist.value = shortBioArtist
    setLibraryFetchArtistResponse(shortBioArtist, false)

    const { wrapper } = await mountView()

    wrapper.vm.isBiographyLong = true
    wrapper.vm.showFullBiography = false

    expect(wrapper.vm.displayedBiography).toBe('compact bio')
  })

  it('navigates to album route with artist query context when poster item clicked', async () => {
    const { wrapper, router } = await mountView()

    await wrapper.get('.poster-click').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('album')
    expect(router.currentRoute.value.params.albumId).toBe('album-1')
    expect(router.currentRoute.value.query.from).toBe('artist')
    expect(router.currentRoute.value.query.artistId).toBe('artist1')
    expect(router.currentRoute.value.query.artistName).toBe('Artist One')
  })

  it('navigates with empty artist query fallback when artist lookup is missing', async () => {
    runtime.basicArtist.value = null
    const { wrapper, router } = await mountView()

    await wrapper.get('.poster-click').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.artistId).toBe('')
    expect(router.currentRoute.value.query.artistName).toBe('')
  })

  it('handles image update selection: missing artist name, success, failure result, and thrown error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    runtime.basicArtist.value = null
    const { wrapper: missingArtistWrapper } = await mountView()
    await missingArtistWrapper.get('.selector-select').trigger('click')
    await flushPromises()
    expect(runtime.showErrorToast).toHaveBeenCalledWith('Unable to update artist image: Artist name not found')

    runtime.basicArtist.value = baseArtist()
    const { wrapper: successWrapper } = await mountView()
    vi.mocked(updateArtistImage).mockResolvedValueOnce({ success: true, message: 'done' })
    await successWrapper.get('.selector-select').trigger('click')
    await flushPromises()
    expect(runtime.showInfoToast).toHaveBeenCalledWith('Updating artist image...')
    expect(runtime.showSuccessToast).toHaveBeenCalledWith('Artist image updated successfully for "Artist One"')

    const { wrapper: failWrapper } = await mountView()
    vi.mocked(updateArtistImage).mockResolvedValueOnce({ success: false, message: 'denied' })
    await failWrapper.get('.selector-select').trigger('click')
    await flushPromises()
    expect(runtime.showErrorToast).toHaveBeenCalledWith('Failed to update artist image: denied')

    const { wrapper: throwWrapper } = await mountView()
    vi.mocked(updateArtistImage).mockRejectedValueOnce(new Error('network'))
    await throwWrapper.get('.selector-select').trigger('click')
    await flushPromises()
    expect(runtime.showErrorToast).toHaveBeenCalledWith('An error occurred while updating the artist image')

    consoleErrorSpy.mockRestore()
  })

  it('reacts to mbid watcher by fetching MusicBrainz data when data is not present', async () => {
    runtime.mbArtistData.value = null
    const initial = baseArtist()
    initial.metadata = { biography: 'bio', genres: ['Rock'] }
    runtime.fullArtistData.value = initial
    runtime.basicArtist.value = initial
    setLibraryFetchArtistResponse(initial, false)

    await mountView()
    runtime.fetchMbArtist.mockClear()

    runtime.fullArtistData.value = {
      ...initial,
      metadata: {
        ...initial.metadata,
        mbid: ['new-mbid'],
      },
    }
    await nextTick()

    expect(runtime.fetchMbArtist).toHaveBeenCalledWith('new-mbid')
  })

  it('updates biography-length state when biography watcher receives longer text', async () => {
    const shortBioArtist = baseArtist()
    shortBioArtist.metadata = {
      ...shortBioArtist.metadata,
      biography: 'short bio',
    }
    runtime.fullArtistData.value = shortBioArtist
    runtime.basicArtist.value = shortBioArtist
    setLibraryFetchArtistResponse(shortBioArtist, false)

    const { wrapper } = await mountView()
    expect(wrapper.find('.biography-toggle').exists()).toBe(false)

    runtime.fullArtistData.value = {
      ...shortBioArtist,
      metadata: {
        ...shortBioArtist.metadata,
        biography: 'b'.repeat(430),
      },
    }
    await nextTick()

    expect(wrapper.find('.biography-toggle').exists()).toBe(true)
  })

  it('returns empty displayed biography and genres list when metadata fields are missing', async () => {
    const noMetaArtist = baseArtist()
    noMetaArtist.metadata = {}
    runtime.fullArtistData.value = noMetaArtist
    runtime.basicArtist.value = noMetaArtist
    setLibraryFetchArtistResponse(noMetaArtist, false)

    const { wrapper } = await mountView()

    expect(wrapper.vm.displayedBiography).toBe('')
    expect(wrapper.vm.uniqueGenres).toEqual([])
  })

  it('does not refetch mb data when mbArtistData already exists', async () => {
    runtime.mbArtistData.value = { id: 'already-loaded' }
    const initial = baseArtist()
    initial.metadata = { biography: 'bio', genres: ['Rock'] }
    runtime.fullArtistData.value = initial
    runtime.basicArtist.value = initial
    setLibraryFetchArtistResponse(initial, false)

    await mountView()
    runtime.fetchMbArtist.mockClear()

    runtime.fullArtistData.value = {
      ...initial,
      metadata: {
        ...initial.metadata,
        mbid: ['skip-mbid'],
      },
    }
    await nextTick()

    expect(runtime.fetchMbArtist).not.toHaveBeenCalled()
  })

  it('updates full artist metadata only when library fetch returns artist and no error', async () => {
    const updated = {
      id: 'artist1',
      name: 'Updated Artist',
      metadata: { mbid: ['mbid-updated'], biography: 'updated bio', genres: ['Metal'] },
    }
    setLibraryFetchArtistResponse(updated, false)

    await mountView('artist1')

    expect(runtime.fullArtistData.value?.name).toBe('Updated Artist')

    setLibraryFetchArtistResponse(baseArtist(), true)
    runtime.fullArtistData.value = updated
    await mountView('artist1')

    expect(runtime.fullArtistData.value?.name).toBe('Updated Artist')
  })
})
