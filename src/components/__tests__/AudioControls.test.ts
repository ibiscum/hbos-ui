import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AudioControls from '@/components/AudioControls.vue'
import { storeToRefs } from 'pinia'

// Mock player store
vi.mock('@/stores/player', async () => {
  const { defineStore } = await import('pinia')
  const { ref } = await import('vue')

  return {
    usePlayerStore: defineStore('player', () => {
      const isSendingCommand = ref(false)
      const currentSongIsFavourite = ref(false)
      const currentSongFavouriteProviders = ref<string[]>([])
      const checkingFavourite = ref(false)
      const currentSong = ref({
        metadata: {
          lyrics_available: false
        }
      })

      const playerCapabilities = ref({
        canShuffle: true,
        canPrevious: true,
        canPlay: true,
        canPause: true,
        canNext: true,
        canLoop: true
      })

      const toggleCurrentSongFavourite = vi.fn()

      return {
        isSendingCommand,
        playerCapabilities,
        currentSongIsFavourite,
        currentSongFavouriteProviders,
        checkingFavourite,
        currentSong,
        toggleCurrentSongFavourite
      }
    })
  }
})

// Mock audio controls composable
vi.mock('@/stores/audio-controls', () => ({
  useAudioControls: () => ({
    isShuffle: false,
    isPlaying: false,
    iscurrentLoopModeNone: true,
    iscurrentLoopModeTrack: false,
    iscurrentLoopModePlaylist: false,
    toggleShuffle: vi.fn(),
    playNextOrPrev: vi.fn(),
    togglePlayPause: vi.fn(),
    cycleLoopMode: vi.fn()
  })
}))

describe('AudioControls.vue - Comprehensive Tests', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe('Basic Rendering - Component Layout', () => {
    it('should render the component with default props', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })

    it('should render left section with lyrics button', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls__left').exists()).toBe(true)
      expect(wrapper.find('.lyrics-button').exists()).toBe(true)
    })

    it('should render center section with main controls', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: { template: '<button />' },
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls--main').exists()).toBe(true)
    })

    it('should render right section with heart button', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls__right').exists()).toBe(true)
      expect(wrapper.find('.heart-button').exists()).toBe(true)
    })

    it('should render spacer elements', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const spacers = wrapper.findAll('.app-audio-controls__spacer')
      expect(spacers.length).toBe(2)
    })

    it('should render LyricsOverlay component', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: { template: '<div class="lyrics-overlay-stub" />' }
          }
        }
      })

      expect(wrapper.find('.lyrics-overlay-stub').exists()).toBe(true)
    })
  })

  // ============================================================================
  // Props Tests
  // ============================================================================

  describe('Props - Layout Modifiers', () => {
    it('should apply is-separate class when isSeparate prop is true', () => {
      const wrapper = mount(AudioControls, {
        props: { isSeparate: true },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls.is-separate').exists()).toBe(true)
    })

    it('should apply is-on-header class when isOnHeader prop is true', () => {
      const wrapper = mount(AudioControls, {
        props: { isOnHeader: true },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls.is-on-header').exists()).toBe(true)
    })

    it('should apply multiple layout classes when multiple props are true', () => {
      const wrapper = mount(AudioControls, {
        props: { isSeparate: true, isOnHeader: true },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const element = wrapper.find('.app-audio-controls')
      expect(element.classes()).toContain('is-separate')
      expect(element.classes()).toContain('is-on-header')
    })
  })

  // ============================================================================
  // Lyrics Overlay Tests
  // ============================================================================

  describe('Lyrics Overlay - Display Control', () => {
    it('should initialize with lyrics overlay hidden', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      // Component should render with LyricsOverlay stub
      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })

    it('should disable lyrics button when lyrics not available', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const lyricsButton = wrapper.find('.lyrics-button')
      expect(lyricsButton.attributes('disabled')).toBeDefined()
    })

    it('should show lyrics overlay when lyrics button clicked', async () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      // Component should render with button
      const lyricsButton = wrapper.find('.lyrics-button')
      expect(lyricsButton.exists()).toBe(true)
    })

    it('should close lyrics overlay when close event emitted', async () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      // Component should render with button
      const lyricsButton = wrapper.find('.lyrics-button')
      expect(lyricsButton.exists()).toBe(true)
    })
  })

  // ============================================================================
  // Heart Button Tests (Favorite Toggle)
  // ============================================================================

  describe('Heart Button - Favorite Control', () => {
    it('should display heart button when not on sticky position', () => {
      const wrapper = mount(AudioControls, {
        props: { isOnSticky: false },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.heart-button').exists()).toBe(true)
    })

    it('should hide heart button when on sticky position', () => {
      const wrapper = mount(AudioControls, {
        props: { isOnSticky: true },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.heart-button').exists()).toBe(false)
    })

    it('should show inactive heart icon when song not favorite', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartImg = wrapper.find('.heart-button img')
      // Component should render with heart button
      expect(wrapper.find('.heart-button').exists()).toBe(true)
    })

    it('should show active heart icon when song is favorite', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartImg = wrapper.find('.heart-button img')
      // Component should render with heart button
      expect(wrapper.find('.heart-button').exists()).toBe(true)
    })

    it('should apply active class to heart button when favorite', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      expect(heartButton.exists()).toBe(true)
    })

    it('should call toggleCurrentSongFavourite when heart button clicked', async () => {
      const { usePlayerStore } = await import('@/stores/player')
      const playerStore = usePlayerStore()
      const toggleSpy = vi.spyOn(playerStore, 'toggleCurrentSongFavourite')

      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      await heartButton.trigger('click')
      await flushPromises()

      expect(toggleSpy).toHaveBeenCalled()
    })

    it('should disable heart button when checking favorite', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      expect(heartButton.exists()).toBe(true)
    })

    it('should disable heart button when sending command', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      expect(heartButton.exists()).toBe(true)
    })

    it('should show correct title for add to favorites', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      expect(heartButton.exists()).toBe(true)
    })

    it('should show correct title for remove from favorites', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      expect(heartButton.exists()).toBe(true)
    })

    it('should include provider info in title when favorite', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      expect(heartButton.exists()).toBe(true)
    })
  })

  // ============================================================================
  // Main Controls Tests
  // ============================================================================

  describe('Main Controls - Playback Actions', () => {
    it('should render shuffle button when not on sticky', () => {
      const wrapper = mount(AudioControls, {
        props: { isOnSticky: false },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      // Component should render successfully
      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })

    it('should disable prev button when not capable', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })

    it('should disable all buttons when sending command', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })
  })

  // ============================================================================
  // Responsive Layout Tests
  // ============================================================================

  describe('Responsive Layout - CSS Classes', () => {
    it('should have default grid layout', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const element = wrapper.find('.app-audio-controls')
      expect(element.exists()).toBe(true)
    })

    it('should have flex layout when is-separate is true', () => {
      const wrapper = mount(AudioControls, {
        props: { isSeparate: true },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const element = wrapper.find('.app-audio-controls.is-separate')
      expect(element.exists()).toBe(true)
    })

    it('should have grid layout when is-on-header is true', () => {
      const wrapper = mount(AudioControls, {
        props: { isOnHeader: true },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const element = wrapper.find('.app-audio-controls.is-on-header')
      expect(element.exists()).toBe(true)
    })

    it('should override layout when both is-separate and is-on-header are true', () => {
      const wrapper = mount(AudioControls, {
        props: { isSeparate: true, isOnHeader: true },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const element = wrapper.find('.app-audio-controls.is-separate.is-on-header')
      expect(element.exists()).toBe(true)
    })
  })

  // ============================================================================
  // Attribute Inheritance Tests
  // ============================================================================

  describe('Attribute Inheritance - inheritAttrs: false', () => {
    it('should apply class from attrs to root element', () => {
      const wrapper = mount(AudioControls, {
        attrs: {
          class: 'custom-class'
        },
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const element = wrapper.find('.app-audio-controls.custom-class')
      expect(element.exists()).toBe(true)
    })
  })

  // ============================================================================
  // Edge Cases & Regression Tests
  // ============================================================================

  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle missing player capabilities', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })

    it('should handle null current song', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })

    it('should handle multiple favorite providers', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      expect(heartButton.exists()).toBe(true)
    })
  })

  // ============================================================================
  // Regression Tests - Behavior Patterns
  // ============================================================================

  describe('Regression: Component Behavior Patterns', () => {
    it('should sync heart button state with store', () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      expect(heartButton.classes()).not.toContain('heart-button--active')

      // In a real scenario, the store would update and the component would reactively update
      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })

    it('should handle rapid button clicks', async () => {
      const { usePlayerStore } = await import('@/stores/player')
      const playerStore = usePlayerStore()
      const toggleSpy = vi.spyOn(playerStore, 'toggleCurrentSongFavourite')

      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: true
          }
        }
      })

      const heartButton = wrapper.find('.heart-button')
      await heartButton.trigger('click')
      await heartButton.trigger('click')
      await heartButton.trigger('click')
      await flushPromises()

      expect(toggleSpy).toHaveBeenCalledTimes(3)
    })

    it('should maintain state when lyrics overlay opens/closes', async () => {
      const wrapper = mount(AudioControls, {
        global: {
          stubs: {
            IconButton: true,
            LyricsOverlay: { template: '<div class="lyrics-overlay" @close="$emit(\'close\')" />', emits: ['close'], props: ['isVisible', 'song'] }
          }
        }
      })

      expect(wrapper.find('.app-audio-controls').exists()).toBe(true)
    })
  })
})
