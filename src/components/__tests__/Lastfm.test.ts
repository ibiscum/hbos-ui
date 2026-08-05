import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import Lastfm from '@/components/Lastfm.vue'

const apiMocks = vi.hoisted(() => ({
  getLastFMStatus: vi.fn(),
  startLastFMAuth: vi.fn(),
  prepareLastFMAuthCompletion: vi.fn(),
  completeLastFMAuth: vi.fn(),
  disconnectLastFM: vi.fn(),
}))

const settingsStoreMock = vi.hoisted(() => ({
  loaded: true,
  getLastfmSettings: {
    scrobble: true,
    manageFavourites: true,
  },
  loadSettings: vi.fn(),
  updateLastfmSettings: vi.fn(),
}))

vi.mock('@/api/lastfm', () => ({
  getLastFMStatus: apiMocks.getLastFMStatus,
  startLastFMAuth: apiMocks.startLastFMAuth,
  prepareLastFMAuthCompletion: apiMocks.prepareLastFMAuthCompletion,
  completeLastFMAuth: apiMocks.completeLastFMAuth,
  disconnectLastFM: apiMocks.disconnectLastFM,
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}))

function mountComponent() {
  return mount(Lastfm, {
    global: {
      stubs: {
        Icon: {
          props: ['icon'],
          template: '<i class="icon-stub" :data-icon="icon" />',
        },
        ToggleSwitch: {
          props: ['modelValue', 'disabled'],
          emits: ['update:model-value'],
          template:
            '<button class="toggle-switch-stub" @click="$emit(\'update:model-value\', !modelValue)" />',
        },
      },
    },
  })
}

describe('Lastfm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()

    settingsStoreMock.loaded = true
    settingsStoreMock.getLastfmSettings.scrobble = true
    settingsStoreMock.getLastfmSettings.manageFavourites = true
    settingsStoreMock.loadSettings.mockResolvedValue(undefined)
    settingsStoreMock.updateLastfmSettings.mockResolvedValue(undefined)

    apiMocks.getLastFMStatus.mockResolvedValue({ authenticated: false })
    apiMocks.startLastFMAuth.mockResolvedValue({
      url: 'https://www.last.fm/api/auth/?token=req-token',
      request_token: 'req-token',
    })
    apiMocks.prepareLastFMAuthCompletion.mockResolvedValue({ success: true })
    apiMocks.completeLastFMAuth.mockResolvedValue({ authenticated: true, username: 'alice' })
    apiMocks.disconnectLastFM.mockResolvedValue({ authenticated: false })

    localStorage.clear()
    sessionStorage.clear()

    vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useRealTimers()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('renders Last.fm service details and disconnected state on mount', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Last.fm')
    expect(wrapper.find('.icon-stub').attributes('data-icon')).toBe('last-fm')
    expect(wrapper.find('.status-badge.gray').exists()).toBe(true)
    expect(wrapper.text()).toContain('Not connected to Last.fm')
    expect(wrapper.find('.btn-connect').exists()).toBe(true)
    expect(apiMocks.getLastFMStatus).toHaveBeenCalledTimes(1)
  })

  it('loads settings on mount when store was not loaded', async () => {
    settingsStoreMock.loaded = false

    mountComponent()
    await flushPromises()

    expect(settingsStoreMock.loadSettings).toHaveBeenCalledTimes(1)
  })

  it('shows connected state when backend reports authenticated user', async () => {
    apiMocks.getLastFMStatus.mockResolvedValueOnce({
      authenticated: true,
      username: 'alice',
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.status-badge.green').exists()).toBe(true)
    expect(wrapper.text()).toContain('Connected to Last.fm')
    expect(wrapper.find('.btn-disconnect').exists()).toBe(true)
    expect(wrapper.find('.btn-connect').exists()).toBe(false)
  })

  it('starts auth flow, stores request token and opens authorization URL', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(apiMocks.startLastFMAuth).toHaveBeenCalledTimes(1)
    expect(apiMocks.prepareLastFMAuthCompletion).toHaveBeenCalledWith('req-token')
    expect(localStorage.getItem('lastfm_request_token')).toBe('req-token')
    expect(sessionStorage.getItem('lastfm_auth_in_progress')).toBe('true')
    expect(window.open).toHaveBeenCalledWith(
      'https://www.last.fm/api/auth/?token=req-token',
      '_blank',
    )
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
  })

  it('shows error state when auth start response is missing URL or token', async () => {
    apiMocks.startLastFMAuth.mockResolvedValueOnce({
      url: '',
      request_token: '',
      error: 'MissingAuthPayload',
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.find('.status-badge.red').exists()).toBe(true)
    expect(wrapper.text()).toContain('Connection error')
    expect(wrapper.text()).toContain('Error: MissingAuthPayload')
    expect(wrapper.find('.btn-connect').attributes('disabled')).toBeUndefined()
    expect(sessionStorage.getItem('lastfm_auth_in_progress')).toBeNull()
  })

  it('surfaces network error when auth start throws', async () => {
    apiMocks.startLastFMAuth.mockRejectedValueOnce(new Error('network down'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error: network down')
    expect(sessionStorage.getItem('lastfm_auth_in_progress')).toBeNull()
    expect(wrapper.find('.btn-connect').attributes('disabled')).toBeUndefined()
  })

  it('handles backend prepare failure response during connect', async () => {
    apiMocks.prepareLastFMAuthCompletion.mockResolvedValueOnce({
      success: false,
      error: 'backend unavailable',
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(apiMocks.prepareLastFMAuthCompletion).toHaveBeenCalledWith('req-token')
    expect(localStorage.getItem('lastfm_request_token')).toBeNull()
    expect(window.open).toHaveBeenCalledWith(
      'https://www.last.fm/api/auth/?token=req-token',
      '_blank',
    )
    expect(wrapper.find('.btn-connect').attributes('disabled')).toBeUndefined()
  })

  it('handles backend prepare exception during connect', async () => {
    apiMocks.prepareLastFMAuthCompletion.mockRejectedValueOnce(new Error('prepare failed'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(localStorage.getItem('lastfm_request_token')).toBeNull()
    expect(wrapper.find('.btn-connect').attributes('disabled')).toBeUndefined()
  })

  it('regression: allows reconnect after successful auth polling and disconnect', async () => {
    vi.useFakeTimers()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(apiMocks.completeLastFMAuth).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.btn-disconnect').exists()).toBe(true)

    await wrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    const reconnectButton = wrapper.find('.btn-connect')
    expect(reconnectButton.exists()).toBe(true)
    expect(reconnectButton.attributes('disabled')).toBeUndefined()
  })

  it('continues polling when auth is not authorized yet', async () => {
    vi.useFakeTimers()
    apiMocks.completeLastFMAuth.mockResolvedValueOnce({
      authenticated: false,
      error: 'TokenNotAuthorized',
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(apiMocks.completeLastFMAuth).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
    expect(wrapper.find('.btn-connect').exists()).toBe(false)
  })

  it('continues polling for unauthorized ApiError branch', async () => {
    vi.useFakeTimers()
    apiMocks.completeLastFMAuth.mockResolvedValueOnce({
      authenticated: false,
      error: 'ApiError',
      error_description: 'Unauthorized Token: still pending',
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(apiMocks.completeLastFMAuth).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
  })

  it('stops polling on non-authorized auth completion error payload', async () => {
    vi.useFakeTimers()
    apiMocks.completeLastFMAuth.mockResolvedValueOnce({
      authenticated: false,
      error: 'DeniedByUser',
      error_description: 'User denied access',
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
    expect(wrapper.find('.btn-connect').exists()).toBe(true)
  })

  it('stops polling when auth completion request throws', async () => {
    vi.useFakeTimers()
    apiMocks.completeLastFMAuth.mockRejectedValueOnce(new Error('poll failed'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
    expect(wrapper.find('.btn-connect').exists()).toBe(true)
  })

  it('regression: abort clears auth state and local/session storage', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.btn-cancel').exists()).toBe(true)

    await wrapper.find('.btn-cancel').trigger('click')
    await flushPromises()

    expect(localStorage.getItem('lastfm_request_token')).toBeNull()
    expect(sessionStorage.getItem('lastfm_auth_in_progress')).toBeNull()
    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
    expect(wrapper.find('.btn-connect').exists()).toBe(true)
  })

  it('handles disconnect error payload and keeps connected status', async () => {
    apiMocks.getLastFMStatus.mockResolvedValueOnce({ authenticated: true, username: 'alice' })
    apiMocks.disconnectLastFM.mockResolvedValueOnce({
      authenticated: true,
      error: 'DisconnectFailed',
      error_description: 'Service unavailable',
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error disconnecting: Service unavailable')
    expect(wrapper.find('.btn-disconnect').exists()).toBe(true)
  })

  it('handles disconnect request exceptions', async () => {
    apiMocks.getLastFMStatus.mockResolvedValueOnce({ authenticated: true, username: 'alice' })
    apiMocks.disconnectLastFM.mockRejectedValueOnce(new Error('disconnect exploded'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error: disconnect exploded')
  })

  it('expands settings panel and saves toggled settings', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.expand-caret').trigger('click')
    expect(wrapper.find('.settings-section').exists()).toBe(true)

    const toggles = wrapper.findAll('.toggle-switch-stub')
    await toggles[0].trigger('click')
    await toggles[1].trigger('click')
    await flushPromises()

    expect(settingsStoreMock.updateLastfmSettings).toHaveBeenCalledTimes(2)
    expect(settingsStoreMock.updateLastfmSettings).toHaveBeenCalledWith({
      scrobble: false,
      manageFavourites: false,
    })
  })

  it('handles settings save failures gracefully', async () => {
    settingsStoreMock.updateLastfmSettings.mockRejectedValueOnce(new Error('save failed'))
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.expand-caret').trigger('click')
    await wrapper.findAll('.toggle-switch-stub')[0].trigger('click')
    await flushPromises()

    expect(settingsStoreMock.updateLastfmSettings).toHaveBeenCalledTimes(1)
  })

  it('shows status-check error state when initial status fetch fails', async () => {
    apiMocks.getLastFMStatus.mockRejectedValueOnce(new Error('status offline'))

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.find('.status-badge.red').exists()).toBe(true)
    expect(wrapper.text()).toContain('Connection error')
    expect(wrapper.text()).toContain('Failed to check Last.fm status. Please try again.')
  })

  it('regression: resumes auth session from stored token during status check', async () => {
    localStorage.setItem('lastfm_request_token', 'stored-token')

    const wrapper = mountComponent()
    await flushPromises()

    expect(apiMocks.prepareLastFMAuthCompletion).toHaveBeenCalledWith('stored-token')
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
  })

  it('aborts stale in-progress auth on mount when stored token and session flag exist', async () => {
    localStorage.setItem('lastfm_request_token', 'stale-token')
    sessionStorage.setItem('lastfm_auth_in_progress', 'true')

    const wrapper = mountComponent()
    await flushPromises()

    expect(localStorage.getItem('lastfm_request_token')).toBeNull()
    expect(sessionStorage.getItem('lastfm_auth_in_progress')).toBeNull()
    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
  })

  it('stops polling on unmount', async () => {
    vi.useFakeTimers()
    apiMocks.completeLastFMAuth.mockResolvedValue({
      authenticated: false,
      error: 'TokenNotAuthorized',
    })

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(10000)

    expect(apiMocks.completeLastFMAuth).toHaveBeenCalledTimes(0)
  })

  it('replaces existing auth poll interval when polling is started again', async () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const wrapper = mountComponent()
    await flushPromises()

    const setupState = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState as {
      startAuthPolling: () => void
    }

    setupState.startAuthPolling()
    setupState.startAuthPolling()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('returns early from auth completion polling when no token and not in progress', async () => {
    localStorage.removeItem('lastfm_request_token')
    const wrapper = mountComponent()
    await flushPromises()

    const setupState = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState as {
      attemptToCompleteAuth: () => Promise<void>
    }

    await setupState.attemptToCompleteAuth()

    expect(apiMocks.completeLastFMAuth).toHaveBeenCalledTimes(0)
    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
  })

  it('uses fallback messages for unknown auth/disconnect errors', async () => {
    apiMocks.startLastFMAuth.mockRejectedValueOnce('bad start')

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Error: Unknown error')

    apiMocks.getLastFMStatus.mockResolvedValueOnce({ authenticated: true, username: undefined })
    apiMocks.disconnectLastFM.mockResolvedValueOnce({ authenticated: true })

    const connectedWrapper = mountComponent()
    await flushPromises()
    await connectedWrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    expect(connectedWrapper.text()).toContain('Error disconnecting: Unknown error during disconnect.')
  })

  it('uses unknown prepare-backend error fallback and keep-open flow', async () => {
    apiMocks.prepareLastFMAuthCompletion.mockResolvedValueOnce({ success: false })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(window.open).toHaveBeenCalled()
    expect(localStorage.getItem('lastfm_request_token')).toBeNull()
  })
})
