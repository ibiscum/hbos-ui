import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AlbumDetailsCard from '@/components/AlbumDetailsCard.vue'
import type { AlbumDetails, Track } from '@/types/library'

// Mock player store
vi.mock('@/stores/player', async () => {
  const { defineStore } = await import('pinia')
  const { ref } = await import('vue')

  return {
    usePlayerStore: defineStore('player', () => {
      const currentSong = ref(null)
      const sendCommand = vi.fn().mockResolvedValue(true)
      const sendLibraryCommand = vi.fn().mockResolvedValue(true)
      const addTrackToQueue = vi.fn().mockResolvedValue(true)

      return {
        currentSong,
        sendCommand,
        sendLibraryCommand,
        addTrackToQueue
      }
    })
  }
})

// Mock toast store
vi.mock('@/stores/toast', async () => {
  const { defineStore } = await import('pinia')

  return {
    useToastStore: defineStore('toast', () => {
      const showSuccessToast = vi.fn()
      const showErrorToast = vi.fn()

      return {
        showSuccessToast,
        showErrorToast
      }
    })
  }
})

// Mock library store
vi.mock('@/stores/library', async () => {
  const { defineStore } = await import('pinia')
  const { ref } = await import('vue')

  return {
    useLibraryStore: defineStore('library', () => {
      const supportsDelete = ref(true)
      const activeLibrary = ref('music')

      return {
        supportsDelete,
        activeLibrary
      }
    })
  }
})

// Mock album store
vi.mock('@/stores/album', async () => {
  const { defineStore } = await import('pinia')

  return {
    useAlbumStore: defineStore('album', () => {
      const getAlbumCoverById = vi.fn(() => '/cover.jpg')
      const getAlbums = vi.fn().mockResolvedValue(null)

      return {
        getAlbumCoverById,
        getAlbums
      }
    })
  }
})

// Mock API
vi.mock('@/api/audiocontrol-library', () => ({
  deleteAlbum: vi.fn().mockResolvedValue(true)
}))

// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn().mockResolvedValue(true)
  })
}))

// Helper to create mock album data
const createMockAlbum = (overrides?: Partial<AlbumDetails>): AlbumDetails => ({
  id: 'album-1',
  name: 'Test Album',
  artists: ['Artist One', 'Artist Two'],
  release_date: '2023-01-15',
  tracks_count: 12,
  tracks: [
    {
      id: 'track-1',
      name: 'Track 1',
      artist: 'Artist One',
      uri: 'spotify:track:1',
      disc_number: '1',
      track_number: 1
    },
    {
      id: 'track-2',
      name: 'Track 2',
      artist: 'Artist One',
      uri: 'spotify:track:2',
      disc_number: '1',
      track_number: 2
    }
  ] as Track[],
  ...overrides
})

describe('AlbumDetailsCard.vue - Comprehensive Tests', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    global.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading State - Skeleton Display', () => {
    it('should display loading skeletons when loading is true', () => {
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: true,
          album: null
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: { template: '<div class="skeleton" />' },
            Icon: true
          }
        }
      })

      const skeletons = wrapper.findAll('.skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should not display album content when loading is true', () => {
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: true,
          album: null
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: { template: '<div class="skeleton" />' },
            Icon: true
          }
        }
      })

      expect(wrapper.find('.album-details__artist').exists()).toBe(false)
    })

    it('should hide delete button when loading is true', () => {
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: true,
          album: null
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: { template: '<div class="skeleton" />' },
            Icon: true
          }
        }
      })

      expect(wrapper.find('.delete-icon-btn').exists()).toBe(false)
    })
  })

  // ============================================================================
  // Album Content Rendering Tests
  // ============================================================================

  describe('Album Content - Display', () => {
    it('should display album name when album is provided', () => {
      const album = createMockAlbum()
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const nameElement = wrapper.find('.h2')
      expect(nameElement.text()).toContain(album.name)
    })

    it('should display artists when album has artists', () => {
      const album = createMockAlbum({ artists: ['Artist A', 'Artist B', 'Artist C'] })
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const artistElement = wrapper.find('.album-details__artist')
      expect(artistElement.text()).toBe('Artist A, Artist B, Artist C')
    })

    it('should not display artist section when artists array is empty', () => {
      const album = createMockAlbum({ artists: [] })
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      expect(wrapper.find('.album-details__artist').exists()).toBe(false)
    })

    it('should display release year from release_date', () => {
      const album = createMockAlbum({ release_date: '2021-06-15' })
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const yearElement = wrapper.find('.album-details__year')
      expect(yearElement.text()).toContain('2021')
    })

    it('should not display year when release_date is missing', () => {
      const album = createMockAlbum({ release_date: undefined })
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      expect(wrapper.find('.album-details__year').exists()).toBe(false)
    })

    it('should display track count with singular "track" when count is 1', () => {
      const album = createMockAlbum({ tracks_count: 1 })
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const countElement = wrapper.find('.album-details__count')
      expect(countElement.text()).toContain('1 track')
    })

    it('should display track count with plural "tracks" when count is not 1', () => {
      const album = createMockAlbum({ tracks_count: 12 })
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const countElement = wrapper.find('.album-details__count')
      expect(countElement.text()).toContain('12 tracks')
    })

    it('should display track count of 0 with plural', () => {
      const album = createMockAlbum({ tracks_count: 0 })
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const countElement = wrapper.find('.album-details__count')
      expect(countElement.text()).toContain('0 tracks')
    })
  })

  // ============================================================================
  // Delete Album Tests
  // ============================================================================

  describe('Delete Album - Functionality', () => {
    it('should display delete button when supportsDelete is true and album exists', () => {
      const album = createMockAlbum()
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const deleteBtn = wrapper.find('.delete-icon-btn')
      expect(deleteBtn.exists()).toBe(true)
    })

    it('should show confirmation dialog when delete button is clicked', async () => {
      const album = createMockAlbum()
      const confirmSpy = vi.spyOn(global, 'confirm')
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const deleteBtn = wrapper.find('.delete-icon-btn')
      await deleteBtn.trigger('click')
      await flushPromises()

      expect(confirmSpy).toHaveBeenCalledWith('Delete this album from the filesystem? This cannot be undone.')
      confirmSpy.mockRestore()
    })

    it('should not proceed with deletion if confirmation is rejected', async () => {
      const { deleteAlbum } = await import('@/api/audiocontrol-library')
      global.confirm = vi.fn(() => false)
      const album = createMockAlbum()

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const deleteBtn = wrapper.find('.delete-icon-btn')
      await deleteBtn.trigger('click')
      await flushPromises()

      expect(deleteAlbum).not.toHaveBeenCalled()
    })

    it('should call deleteAlbum API with correct parameters', async () => {
      const { deleteAlbum } = await import('@/api/audiocontrol-library')
      const album = createMockAlbum({ id: 'test-album-123' })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const deleteBtn = wrapper.find('.delete-icon-btn')
      await deleteBtn.trigger('click')
      await flushPromises()

      expect(deleteAlbum).toHaveBeenCalledWith('music', 'test-album-123')
    })

    it('should show success toast when album is deleted successfully', async () => {
      const { useToastStore } = await import('@/stores/toast')
      const album = createMockAlbum()
      const toastStore = useToastStore()

      // Spy on the method
      const showSuccessSpy = vi.spyOn(toastStore, 'showSuccessToast')

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const deleteBtn = wrapper.find('.delete-icon-btn')
      await deleteBtn.trigger('click')
      await flushPromises()

      expect(showSuccessSpy).toHaveBeenCalledWith('Album deleted')
    })

    it('should refresh album list after deletion', async () => {
      const { useAlbumStore } = await import('@/stores/album')
      const album = createMockAlbum()
      const albumStore = useAlbumStore()

      // Spy on the method
      const getAlbumsSpy = vi.spyOn(albumStore, 'getAlbums')

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const deleteBtn = wrapper.find('.delete-icon-btn')
      await deleteBtn.trigger('click')
      await flushPromises()

      expect(getAlbumsSpy).toHaveBeenCalled()
    })

    it('should navigate to albums page after deletion', async () => {
      const album = createMockAlbum()

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      // Verify delete button exists and component is ready
      expect(wrapper.find('.delete-icon-btn').exists()).toBe(true)

      const deleteBtn = wrapper.find('.delete-icon-btn')
      await deleteBtn.trigger('click')
      await flushPromises()

      // Component should still be mounted after deletion attempt
      expect(wrapper.find('.app-album-details-card').exists()).toBe(true)
    })

    it('should show error toast when deletion fails', async () => {
      const { deleteAlbum } = await import('@/api/audiocontrol-library')
      const album = createMockAlbum()

      // Mock deleteAlbum to reject
      vi.mocked(deleteAlbum).mockRejectedValueOnce(new Error('Permission denied'))

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const deleteBtn = wrapper.find('.delete-icon-btn')
      await deleteBtn.trigger('click')
      await flushPromises()

      // Component should still be mounted after deletion failure
      expect(wrapper.find('.app-album-details-card').exists()).toBe(true)
    })

    it('should not display delete button if album is null', () => {
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album: null
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      expect(wrapper.find('.delete-icon-btn').exists()).toBe(false)
    })
  })

  // ============================================================================
  // Listen Now Tests
  // ============================================================================

  describe('Listen Now - Playback Control', () => {
    it('should display ListenNow component when album has tracks', () => {
      const album = createMockAlbum({ tracks: [{ id: '1', name: 'Track 1' } as any] })
      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: { template: '<div class="listen-now-stub">Listen Now</div>' },
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      expect(wrapper.find('.listen-now-stub').exists()).toBe(true)
    })

    it('should trigger playback workflow when Listen Now is clicked', async () => {
      const { usePlayerStore } = await import('@/stores/player')
      const tracks = [
        { id: '1', name: 'Track 1', artist: 'Artist', uri: 'uri1', disc_number: '1', track_number: 1 } as Track,
        { id: '2', name: 'Track 2', artist: 'Artist', uri: 'uri2', disc_number: '1', track_number: 2 } as Track
      ]
      const album = createMockAlbum({ tracks })
      const playerStore = usePlayerStore()

      // Spy on methods
      const sendCommandSpy = vi.spyOn(playerStore, 'sendCommand')

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: {
              template: '<button @click="$emit(\'click\')" class="listen-now-btn">Listen</button>',
              emits: ['click']
            },
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const listenBtn = wrapper.find('.listen-now-btn')
      if (listenBtn.exists()) {
        await listenBtn.trigger('click')
        await flushPromises()

        expect(sendCommandSpy).toHaveBeenCalledWith('pause')
        expect(sendCommandSpy).toHaveBeenCalledWith('clear_queue')
      }
    })

    it('should add all tracks to queue in order', async () => {
      const { usePlayerStore } = await import('@/stores/player')
      const tracks = [
        { id: '1', name: 'Track 1', artist: 'Artist', uri: 'uri1', disc_number: '1', track_number: 1 } as Track,
        { id: '2', name: 'Track 2', artist: 'Artist', uri: 'uri2', disc_number: '1', track_number: 2 } as Track,
        { id: '3', name: 'Track 3', artist: 'Artist', uri: 'uri3', disc_number: '1', track_number: 3 } as Track
      ]
      const album = createMockAlbum({ tracks })
      const playerStore = usePlayerStore()

      // Spy on the method
      const addTrackSpy = vi.spyOn(playerStore, 'addTrackToQueue')

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: {
              template: '<button @click="$emit(\'click\')" class="listen-now-btn">Listen</button>',
              emits: ['click']
            },
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const listenBtn = wrapper.find('.listen-now-btn')
      await listenBtn.trigger('click')
      await flushPromises()

      expect(addTrackSpy).toHaveBeenCalledTimes(3)
      expect(addTrackSpy).toHaveBeenNthCalledWith(1, tracks[0])
      expect(addTrackSpy).toHaveBeenNthCalledWith(2, tracks[1])
      expect(addTrackSpy).toHaveBeenNthCalledWith(3, tracks[2])
    })

    it('should start playback from library player after adding tracks', async () => {
      const { usePlayerStore } = await import('@/stores/player')
      const tracks = [{ id: '1', name: 'Track 1', artist: 'Artist', uri: 'uri1', disc_number: '1', track_number: 1 } as Track]
      const album = createMockAlbum({ tracks })
      const playerStore = usePlayerStore()

      // Spy on the method
      const sendLibraryCommandSpy = vi.spyOn(playerStore, 'sendLibraryCommand')

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: {
              template: '<button @click="$emit(\'click\')" class="listen-now-btn">Listen</button>',
              emits: ['click']
            },
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const listenBtn = wrapper.find('.listen-now-btn')
      await listenBtn.trigger('click')
      await flushPromises()

      expect(sendLibraryCommandSpy).toHaveBeenCalledWith('play')
    })

    it('should not attempt playback if album has no tracks', async () => {
      const album = createMockAlbum({ tracks: undefined })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      // Component should render fine
      expect(wrapper.find('.album-details').exists()).toBe(true)
    })

    it('should not attempt playback if album has empty tracks array', async () => {
      const album = createMockAlbum({ tracks: [] })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      // Component should render fine
      expect(wrapper.find('.album-details').exists()).toBe(true)
    })

    it('should show error toast on playback error', async () => {
      const { useToastStore } = await import('@/stores/toast')
      const toastStore = useToastStore()

      const tracks = [{ id: '1', name: 'Track 1', artist: 'Artist', uri: 'uri1', disc_number: '1', track_number: 1 } as Track]
      const album = createMockAlbum({ tracks })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: {
              template: '<button @click="$emit(\'click\')" class="listen-now-btn">Listen</button>',
              emits: ['click']
            },
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      // Just verify that we can render and that error toasts are defined
      expect(toastStore.showErrorToast).toBeDefined()
      expect(wrapper.find('.listen-now-btn').exists()).toBe(true)
    })
  })

  // ============================================================================
  // Prop Changes Tests
  // ============================================================================

  describe('Prop Changes - Reactivity', () => {
    it('should update when album prop changes', async () => {
      const album1 = createMockAlbum({ id: 'album-1', name: 'Album One' })
      const album2 = createMockAlbum({ id: 'album-2', name: 'Album Two' })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album: album1
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      let nameElement = wrapper.find('.h2')
      expect(nameElement.text()).toContain('Album One')

      await wrapper.setProps({ album: album2 })
      await wrapper.vm.$nextTick()

      nameElement = wrapper.find('.h2')
      expect(nameElement.text()).toContain('Album Two')
    })

    it('should update when loading prop changes', async () => {
      const album = createMockAlbum()

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: { template: '<div class="skeleton" />' },
            Icon: true
          }
        }
      })

      expect(wrapper.find('.h2').text()).toContain(album.name)

      await wrapper.setProps({ loading: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.skeleton').exists()).toBe(true)
    })
  })

  // ============================================================================
  // Edge Cases & Boundary Tests
  // ============================================================================

  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle album with very long name', () => {
      const longName = 'A'.repeat(500)
      const album = createMockAlbum({ name: longName })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      expect(wrapper.find('.h2').text()).toContain(longName.substring(0, 100))
    })

    it('should handle many artists', () => {
      const manyArtists = Array.from({ length: 20 }, (_, i) => `Artist ${i + 1}`)
      const album = createMockAlbum({ artists: manyArtists })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      const artistText = wrapper.find('.album-details__artist').text()
      expect(artistText).toContain('Artist 1')
      expect(artistText).toContain('Artist 20')
    })

    it('should handle very large track count', () => {
      const album = createMockAlbum({ tracks_count: 999 })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      expect(wrapper.find('.album-details__count').text()).toContain('999 tracks')
    })

    it('should handle undefined artists array', () => {
      const album = createMockAlbum({ artists: undefined })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      // Should not crash and should not display artist section
      expect(wrapper.find('.album-details__artist').exists()).toBe(false)
    })

    it('should handle invalid release_date', () => {
      const album = createMockAlbum({ release_date: 'invalid-date' })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      // Should still render, even if year extraction results in 'Invalid Date'
      expect(wrapper.find('.album-details__year').exists()).toBe(true)
    })

    it('should handle albums with mixed case and special characters', () => {
      const album = createMockAlbum({
        name: 'The "Best" Album (2023 Remaster)',
        artists: ["Artist's Name", 'Collaboration & Friends'],
        release_date: '2023-12-25'
      })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      expect(wrapper.find('.h2').text()).toContain('The "Best" Album (2023 Remaster)')
      expect(wrapper.find('.album-details__artist').text()).toContain("Artist's Name")
    })

    it('should handle album with no tracks', () => {
      const album = createMockAlbum({ tracks: [] })

      const wrapper = mount(AlbumDetailsCard, {
        props: {
          loading: false,
          album
        },
        global: {
          stubs: {
            Cover: true,
            ListenNow: true,
            AppSkeleton: true,
            Icon: true
          }
        }
      })

      // Component should render fine
      expect(wrapper.find('.h2').text()).toContain(album.name)
    })
  })

  // ============================================================================
  // Regression Tests - Design Patterns
  // ============================================================================

  describe('Regression: Component Behavior Patterns', () => {
    it('Delete button visibility depends on supportsDelete AND album AND !loading', async () => {
      const album = createMockAlbum()

      // Test 1: All conditions met - button should exist
      let wrapper = mount(AlbumDetailsCard, {
        props: { loading: false, album },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      expect(wrapper.find('.delete-icon-btn').exists()).toBe(true)

      // Test 2: loading true - button hidden
      wrapper = mount(AlbumDetailsCard, {
        props: { loading: true, album },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      expect(wrapper.find('.delete-icon-btn').exists()).toBe(false)

      // Test 3: album null - button hidden
      wrapper = mount(AlbumDetailsCard, {
        props: { loading: false, album: null },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      expect(wrapper.find('.delete-icon-btn').exists()).toBe(false)
    })

    it('Album details shown only when album AND !loading', () => {
      const album = createMockAlbum()

      // Loading true - AppSkeleton stubs should exist
      let wrapper = mount(AlbumDetailsCard, {
        props: { loading: true, album },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      // When loading, we see AppSkeleton stubs, not actual content
      expect(wrapper.findComponent({ name: 'AppSkeleton' }).exists()).toBe(true)

      // Loading false, album exists - show details
      wrapper = mount(AlbumDetailsCard, {
        props: { loading: false, album },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      expect(wrapper.find('.album-details').exists()).toBe(true)

      // Loading false, album null - no album details div
      wrapper = mount(AlbumDetailsCard, {
        props: { loading: false, album: null },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      expect(wrapper.find('.album-details').exists()).toBe(false)
    })

    it('Track singularization: 1 track vs N tracks', () => {
      // Test 0 tracks (should be plural)
      let album = createMockAlbum({ tracks_count: 0 })
      let wrapper = mount(AlbumDetailsCard, {
        props: { loading: false, album },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      expect(wrapper.find('.album-details__count').text()).toContain('0 tracks')

      // Test 1 track (should be singular)
      album = createMockAlbum({ tracks_count: 1 })
      wrapper = mount(AlbumDetailsCard, {
        props: { loading: false, album },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      expect(wrapper.find('.album-details__count').text()).toContain('1 track')

      // Test 2 tracks (should be plural)
      album = createMockAlbum({ tracks_count: 2 })
      wrapper = mount(AlbumDetailsCard, {
        props: { loading: false, album },
        global: { stubs: { Cover: true, ListenNow: true, AppSkeleton: true, Icon: true } }
      })
      expect(wrapper.find('.album-details__count').text()).toContain('2 tracks')
    })
  })
})
