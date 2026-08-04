import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref, type Ref } from 'vue'
import AudioControls from '@/components/AudioControls.vue'

type SongState = { metadata?: { lyrics_available?: boolean } } | null
type CapabilitiesState = {
  canShuffle: boolean
  canPrevious: boolean
  canPlay: boolean
  canPause: boolean
  canNext: boolean
  canLoop: boolean
}

const toggleCurrentSongFavouriteMock = vi.fn()
const playerState: {
  isSendingCommand: Ref<boolean>
  currentSongIsFavourite: Ref<boolean>
  currentSongFavouriteProviders: Ref<string[]>
  checkingFavourite: Ref<boolean>
  currentSong: Ref<SongState>
  playerCapabilities: Ref<CapabilitiesState>
} = {
  isSendingCommand: ref(false),
  currentSongIsFavourite: ref(false),
  currentSongFavouriteProviders: ref<string[]>([]),
  checkingFavourite: ref(false),
  currentSong: ref<SongState>({ metadata: { lyrics_available: false } }),
  playerCapabilities: ref<CapabilitiesState>({
    canShuffle: true,
    canPrevious: true,
    canPlay: true,
    canPause: true,
    canNext: true,
    canLoop: true,
  }),
}

const resetPlayerState = () => {
  playerState.isSendingCommand.value = false
  playerState.currentSongIsFavourite.value = false
  playerState.currentSongFavouriteProviders.value = []
  playerState.checkingFavourite.value = false
  playerState.currentSong.value = { metadata: { lyrics_available: false } }
  playerState.playerCapabilities.value = {
    canShuffle: true,
    canPrevious: true,
    canPlay: true,
    canPause: true,
    canNext: true,
    canLoop: true,
  }
  toggleCurrentSongFavouriteMock.mockClear()
}

const audioControlsState = {
  isShuffle: false,
  isPlaying: false,
  iscurrentLoopModeNone: true,
  iscurrentLoopModeTrack: false,
  iscurrentLoopModePlaylist: false,
  toggleShuffle: vi.fn(),
  playNextOrPrev: vi.fn(),
  togglePlayPause: vi.fn(),
  cycleLoopMode: vi.fn(),
}

const resetAudioControlsState = () => {
  audioControlsState.isShuffle = false
  audioControlsState.isPlaying = false
  audioControlsState.iscurrentLoopModeNone = true
  audioControlsState.iscurrentLoopModeTrack = false
  audioControlsState.iscurrentLoopModePlaylist = false
  audioControlsState.toggleShuffle.mockClear()
  audioControlsState.playNextOrPrev.mockClear()
  audioControlsState.togglePlayPause.mockClear()
  audioControlsState.cycleLoopMode.mockClear()
}

vi.mock('@/stores/player', async () => {
  const { defineStore } = await import('pinia')
  return {
    usePlayerStore: defineStore('player', () => ({
      ...playerState,
      toggleCurrentSongFavourite: toggleCurrentSongFavouriteMock,
    })),
  }
})

vi.mock('@/stores/audio-controls', () => ({
  useAudioControls: () => audioControlsState,
}))

const IconButtonStub = defineComponent({
  name: 'IconButton',
  props: {
    icon: { type: String, default: '' },
    title: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  template:
    '<button class="icon-button-stub" :data-icon="icon" :data-title="title" :data-disabled="String(disabled)" :disabled="disabled" @click="$emit(\'click\')" />',
})

const LyricsOverlayStub = defineComponent({
  name: 'LyricsOverlay',
  props: {
    isVisible: { type: Boolean, default: false },
    song: { type: Object, default: null },
  },
  emits: ['close'],
  template: '<div class="lyrics-overlay-stub" :data-visible="String(isVisible)" />',
})

const mountComponent = (props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) => {
  return mount(AudioControls, {
    props,
    attrs,
    global: {
      stubs: {
        IconButton: IconButtonStub,
        LyricsOverlay: LyricsOverlayStub,
      },
    },
  })
}

describe('AudioControls.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    resetPlayerState()
    resetAudioControlsState()
  })

  describe('unit: rendering and state binding', () => {
    it('renders full non-sticky layout and composes root classes from props and attrs', () => {
      const wrapper = mountComponent({ isSeparate: true, isOnHeader: true }, { class: 'custom-class' })

      const root = wrapper.get('.app-audio-controls')
      expect(root.classes()).toContain('is-separate')
      expect(root.classes()).toContain('is-on-header')
      expect(root.classes()).toContain('custom-class')
      expect(wrapper.findAll('.app-audio-controls__spacer')).toHaveLength(2)
      expect(wrapper.findAll('.icon-button-stub')).toHaveLength(5)
      expect(wrapper.find('.heart-button').exists()).toBe(true)
    })

    it('hides shuffle, loop, and heart controls in sticky mode while preserving core button order', () => {
      const wrapper = mountComponent({ isOnSticky: true })
      const iconButtons = wrapper.findAll('.icon-button-stub')

      expect(iconButtons).toHaveLength(3)
      expect(iconButtons.map(button => button.attributes('data-title'))).toEqual(['Previous', 'Play/Pause', 'Next'])
      expect(wrapper.find('.heart-button').exists()).toBe(false)
    })

    it('uses play icon when paused and pause icon when playing', () => {
      const paused = mountComponent()
      expect(paused.get('[data-title="Play/Pause"]').attributes('data-icon')).toBe('lucide/play')

      audioControlsState.isPlaying = true
      const playing = mountComponent()
      expect(playing.get('[data-title="Play/Pause"]').attributes('data-icon')).toBe('lucide/pause')
    })

    it('renders loop icon and title for track mode and playlist mode', () => {
      audioControlsState.iscurrentLoopModeNone = false
      audioControlsState.iscurrentLoopModeTrack = true
      const trackWrapper = mountComponent()
      const trackLoopButton = trackWrapper.get('[data-title="Loop Track"]')
      expect(trackLoopButton.attributes('data-icon')).toBe('lucide/repeat-1')
      expect(trackLoopButton.classes()).toContain('active')

      audioControlsState.iscurrentLoopModeTrack = false
      audioControlsState.iscurrentLoopModePlaylist = true
      const playlistWrapper = mountComponent()
      const playlistLoopButton = playlistWrapper.get('[data-title="Loop Playlist"]')
      expect(playlistLoopButton.attributes('data-icon')).toBe('lucide/repeat')
      expect(playlistLoopButton.classes()).toContain('active')
    })

    it('computes heart button title and icon for favorite and non-favorite states', () => {
      const nonFavorite = mountComponent()
      expect(nonFavorite.get('.heart-button').attributes('title')).toBe('Add to favorites')
      expect(nonFavorite.get('.heart-button img').attributes('src')).toContain('heart-outline.svg')

      playerState.currentSongIsFavourite.value = true
      playerState.currentSongFavouriteProviders.value = ['spotify', 'local', 'apple music']
      const favorite = mountComponent()
      expect(favorite.get('.heart-button').classes()).toContain('heart-button--active')
      expect(favorite.get('.heart-button').attributes('title')).toBe('Remove from favorites (Spotify, Local, Apple music)')
      expect(favorite.get('.heart-button img').attributes('src')).toContain('heart-filled.svg')
    })

    it('computes fallback favorite title when no providers are present', () => {
      playerState.currentSongIsFavourite.value = true
      playerState.currentSongFavouriteProviders.value = []

      const wrapper = mountComponent()
      expect(wrapper.get('.heart-button').attributes('title')).toBe('Remove from favorites')
    })

    it('applies disabled states from capabilities, checking flag, and sending-command guard', async () => {
      playerState.playerCapabilities.value.canPrevious = false
      playerState.playerCapabilities.value.canPlay = false
      playerState.playerCapabilities.value.canPause = false
      playerState.checkingFavourite.value = true

      const wrapper = mountComponent()
      expect(wrapper.get('[data-title="Previous"]').attributes('data-disabled')).toBe('true')
      expect(wrapper.get('[data-title="Play/Pause"]').attributes('data-disabled')).toBe('true')
      expect(wrapper.get('.heart-button').attributes('disabled')).toBeDefined()

      playerState.isSendingCommand.value = true
      await wrapper.vm.$nextTick()
      wrapper.findAll('.icon-button-stub').forEach((button) => {
        expect(button.attributes('data-disabled')).toBe('true')
      })
    })
  })

  describe('unit: control actions', () => {
    it('dispatches click actions to the audio controls composable and player store', async () => {
      const wrapper = mountComponent()

      await wrapper.get('[data-title="Shuffle"]').trigger('click')
      await wrapper.get('[data-title="Previous"]').trigger('click')
      await wrapper.get('[data-title="Play/Pause"]').trigger('click')
      await wrapper.get('[data-title="Next"]').trigger('click')
      await wrapper.get('[data-title="Loop"]').trigger('click')
      await wrapper.get('.heart-button').trigger('click')

      expect(audioControlsState.toggleShuffle).toHaveBeenCalledTimes(1)
      expect(audioControlsState.playNextOrPrev).toHaveBeenNthCalledWith(1, 'previous')
      expect(audioControlsState.playNextOrPrev).toHaveBeenNthCalledWith(2, 'next')
      expect(audioControlsState.togglePlayPause).toHaveBeenCalledTimes(1)
      expect(audioControlsState.cycleLoopMode).toHaveBeenCalledTimes(1)
      expect(toggleCurrentSongFavouriteMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('regression: lyrics overlay behavior', () => {
    it('does not open overlay when lyrics are unavailable', async () => {
      playerState.currentSong.value = { metadata: { lyrics_available: false } }
      const wrapper = mountComponent()

      const lyricsButton = wrapper.get('.lyrics-button')
      expect(lyricsButton.attributes('disabled')).toBeDefined()
      expect(wrapper.get('.lyrics-overlay-stub').attributes('data-visible')).toBe('false')

      await lyricsButton.trigger('click')
      expect(wrapper.get('.lyrics-overlay-stub').attributes('data-visible')).toBe('false')
    })

    it('opens on lyrics click and closes on overlay close event when lyrics are available', async () => {
      playerState.currentSong.value = { metadata: { lyrics_available: true } }
      const wrapper = mountComponent()

      const lyricsButton = wrapper.get('.lyrics-button')
      expect(lyricsButton.classes()).toContain('lyrics-button--active')

      await lyricsButton.trigger('click')
      expect(wrapper.get('.lyrics-overlay-stub').attributes('data-visible')).toBe('true')

      wrapper.getComponent(LyricsOverlayStub).vm.$emit('close')
      await wrapper.vm.$nextTick()
      expect(wrapper.get('.lyrics-overlay-stub').attributes('data-visible')).toBe('false')
    })

    it('guards against missing song metadata without opening overlay', async () => {
      playerState.currentSong.value = null
      const wrapper = mountComponent()

      const lyricsButton = wrapper.get('.lyrics-button')
      expect(lyricsButton.attributes('disabled')).toBeDefined()

      await lyricsButton.trigger('click')
      expect(wrapper.get('.lyrics-overlay-stub').attributes('data-visible')).toBe('false')
    })
  })
})
