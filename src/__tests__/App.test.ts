import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import App from '../App.vue'

const mockedStores = vi.hoisted(() => {
  const wsController = {
    disconnect: vi.fn(),
  }

  return {
    playerStore: {
      initPlayer: vi.fn(),
      updateIntervalID: undefined as number | undefined,
      clearPollingInterval: vi.fn(),
    },
    audioControls: {
      progressIntervalID: undefined as number | undefined,
      stopAutoProgress: vi.fn(),
    },
    playerWebSocket: {
      wsController: wsController as { disconnect: () => void } | null,
    },
    wsController,
  }
})

vi.mock('@/stores/player', () => ({
  usePlayerStore: () => mockedStores.playerStore,
}))

vi.mock('@/stores/audio-controls', () => ({
  useAudioControls: () => mockedStores.audioControls,
}))

vi.mock('@/stores/player-web-socket', () => ({
  usePlayerWebSocket: () => mockedStores.playerWebSocket,
}))

vi.mock('@/components/SecurityPrompt.vue', () => ({
  default: {
    name: 'SecurityPrompt',
    template: '<div class="security-prompt" />',
  },
}))

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        RouterView: true,
      },
    },
  })
}

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockedStores.playerStore.updateIntervalID = undefined
    mockedStores.audioControls.progressIntervalID = undefined
    mockedStores.playerWebSocket.wsController = mockedStores.wsController
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders RouterView and SecurityPrompt', () => {
    const wrapper = mountApp()

    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
    expect(wrapper.find('.security-prompt').exists()).toBe(true)
  })

  it('calls initPlayer during setup', () => {
    mountApp()

    expect(mockedStores.playerStore.initPlayer).toHaveBeenCalledTimes(1)
  })

  it('logs an error when initPlayer fails', () => {
    const setupError = new Error('init failed')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedStores.playerStore.initPlayer.mockImplementationOnce(() => {
      throw setupError
    })

    mountApp()

    expect(errorSpy).toHaveBeenCalledWith('Failed to initialize player:', setupError)
  })

  it('runs full cleanup on unmount when all controllers exist', () => {
    mockedStores.audioControls.progressIntervalID = 1
    mockedStores.playerStore.updateIntervalID = 1

    const wrapper = mountApp()
    wrapper.unmount()

    expect(mockedStores.audioControls.stopAutoProgress).toHaveBeenCalledTimes(1)
    expect(mockedStores.playerStore.clearPollingInterval).toHaveBeenCalledTimes(1)
    expect(mockedStores.wsController.disconnect).toHaveBeenCalledTimes(1)
    expect(mockedStores.playerWebSocket.wsController).toBeNull()
  })

  it('skips optional cleanup steps when handles are missing', () => {
    mockedStores.playerWebSocket.wsController = null

    const wrapper = mountApp()
    wrapper.unmount()

    expect(mockedStores.audioControls.stopAutoProgress).not.toHaveBeenCalled()
    expect(mockedStores.playerStore.clearPollingInterval).not.toHaveBeenCalled()
    expect(mockedStores.wsController.disconnect).not.toHaveBeenCalled()
  })

  it('logs disconnect errors and still clears websocket reference', () => {
    const disconnectError = new Error('disconnect failed')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedStores.playerWebSocket.wsController = {
      disconnect: vi.fn(() => {
        throw disconnectError
      }),
    }

    const wrapper = mountApp()
    wrapper.unmount()

    expect(errorSpy).toHaveBeenCalledWith('Error disconnecting WebSocket:', disconnectError)
    expect(mockedStores.playerWebSocket.wsController).toBeNull()
  })

  it('logs cleanup errors when a cleanup step throws', () => {
    const cleanupError = new Error('cleanup failed')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockedStores.audioControls.progressIntervalID = 1
    mockedStores.playerStore.updateIntervalID = 1
    mockedStores.audioControls.stopAutoProgress.mockImplementationOnce(() => {
      throw cleanupError
    })

    const wrapper = mountApp()
    wrapper.unmount()

    expect(errorSpy).toHaveBeenCalledWith('Error during cleanup:', cleanupError)
    expect(mockedStores.playerStore.clearPollingInterval).not.toHaveBeenCalled()
    expect(mockedStores.wsController.disconnect).not.toHaveBeenCalled()
  })
})
