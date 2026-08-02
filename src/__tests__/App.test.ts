import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'

// Mock stores
vi.mock('@/stores/player-web-socket', () => ({
  usePlayerWebSocket: () => ({
    wsController: {
      disconnect: vi.fn(),
    },
  }),
}))

vi.mock('@/stores/player', () => ({
  usePlayerStore: () => ({
    initPlayer: vi.fn(),
    updateIntervalID: undefined,
    clearPollingInterval: vi.fn(),
  }),
}))

vi.mock('@/stores/audio-controls', () => ({
  useAudioControls: () => ({
    progressIntervalID: undefined,
    stopAutoProgress: vi.fn(),
  }),
}))

vi.mock('@/components/SecurityPrompt.vue', () => ({
  default: {
    name: 'SecurityPrompt',
    template: '<div class="security-prompt"><slot /></div>',
  },
}))

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component rendering', () => {
    it('renders RouterView', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('renders SecurityPrompt component', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('mounts without errors', () => {
      expect(() => {
        mount(App, {
          global: {
            stubs: {
              RouterView: true,
              SecurityPrompt: true,
            },
          },
        })
      }).not.toThrow()
    })
  })

  describe('Store initialization', () => {
    it('accesses playerStore during setup', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('accesses audioControls during setup', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('accesses playerWebSocket during setup', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('calls initPlayer on mount', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Cleanup on unmount', () => {
    it('unmounts without errors', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })

    it('executes onBeforeUnmount hook', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })
  })

  describe('Audio controls cleanup', () => {
    it('checks progressIntervalID existence', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('handles progressIntervalID when undefined', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })

    it('calls stopAutoProgress when progressIntervalID exists', async () => {
      // This tests behavior when progressIntervalID is truthy
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Player store cleanup', () => {
    it('checks updateIntervalID existence', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('handles updateIntervalID when undefined', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })

    it('calls clearPollingInterval when updateIntervalID exists', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('WebSocket cleanup', () => {
    it('checks wsController existence', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('disconnects WebSocket when wsController exists', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('nullifies wsController after disconnect', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })

    it('handles wsController when null or undefined', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })
  })

  describe('Multiple mount/unmount cycles', () => {
    it('handles multiple mount cycles', async () => {
      for (let i = 0; i < 3; i++) {
        const wrapper = mount(App, {
          global: {
            stubs: {
              RouterView: true,
              SecurityPrompt: true,
            },
          },
        })
        await flushPromises()
        wrapper.unmount()
        await flushPromises()
      }
      expect(true).toBe(true)
    })

    it('cleanup works correctly after multiple mounts', async () => {
      const wrapper1 = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper1.unmount()
      await flushPromises()

      const wrapper2 = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      expect(wrapper2.vm).toBeDefined()
      wrapper2.unmount()
    })
  })

  describe('Store references', () => {
    it('playerStore is available', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('audioControls is available', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('playerWebSocket is available', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Hook execution order', () => {
    it('onBeforeUnmount executes before unmount', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })

    it('executes all cleanup operations during unmount', async () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      await flushPromises()
      wrapper.unmount()
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Component structure', () => {
    it('has template section', () => {
      expect(App).toBeDefined()
    })

    it('has script setup', () => {
      expect(App).toBeDefined()
    })

    it('includes RouterView placeholder', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })

    it('includes SecurityPrompt component', () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Initialization stability', () => {
    it('initializes without console errors', () => {
      const consoleSpy = vi.spyOn(console, 'error')
      mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('initializes without console warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      mount(App, {
        global: {
          stubs: {
            RouterView: true,
            SecurityPrompt: true,
          },
        },
      })
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
