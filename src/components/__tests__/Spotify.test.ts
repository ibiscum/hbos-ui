import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'

import Spotify from '@/components/Spotify.vue'

const apiMocks = vi.hoisted(() => ({
  getSpotifyStatus: vi.fn(),
  createSpotifySession: vi.fn(),
  getSpotifyLoginUrl: vi.fn(),
  pollSpotifyAuth: vi.fn(),
  storeSpotifyTokens: vi.fn(),
  disconnectSpotify: vi.fn(),
}))

const settingsStoreMock = vi.hoisted(() => ({
  loaded: true,
  getSpotifySettings: {
    controlPlayer: true,
    manageFavourites: true,
  },
  loadSettings: vi.fn(),
  updateSpotifySettings: vi.fn(),
}))

vi.mock('@/api/spotify', () => ({
  getSpotifyStatus: apiMocks.getSpotifyStatus,
  createSpotifySession: apiMocks.createSpotifySession,
  getSpotifyLoginUrl: apiMocks.getSpotifyLoginUrl,
  pollSpotifyAuth: apiMocks.pollSpotifyAuth,
  storeSpotifyTokens: apiMocks.storeSpotifyTokens,
  disconnectSpotify: apiMocks.disconnectSpotify,
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}))

const mountedWrappers: VueWrapper[] = []

function mountComponent() {
  const wrapper = mount(Spotify, {
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
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('Spotify.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()

    apiMocks.getSpotifyStatus.mockReset()
    apiMocks.createSpotifySession.mockReset()
    apiMocks.getSpotifyLoginUrl.mockReset()
    apiMocks.pollSpotifyAuth.mockReset()
    apiMocks.storeSpotifyTokens.mockReset()
    apiMocks.disconnectSpotify.mockReset()

    settingsStoreMock.loadSettings.mockReset()
    settingsStoreMock.updateSpotifySettings.mockReset()

    settingsStoreMock.loaded = true
    settingsStoreMock.getSpotifySettings.controlPlayer = true
    settingsStoreMock.getSpotifySettings.manageFavourites = true
    settingsStoreMock.loadSettings.mockResolvedValue(undefined)
    settingsStoreMock.updateSpotifySettings.mockResolvedValue(undefined)

    apiMocks.getSpotifyStatus.mockResolvedValue({ authenticated: false })
    apiMocks.createSpotifySession.mockResolvedValue({ session_id: 'session-1' })
    apiMocks.getSpotifyLoginUrl.mockResolvedValue({
      status: 'success',
      message: 'https://accounts.spotify.com/authorize?foo=bar&amp;x=1',
    })
    apiMocks.pollSpotifyAuth.mockResolvedValue({ status: 'pending' })
    apiMocks.storeSpotifyTokens.mockResolvedValue({ status: 'success' })
    apiMocks.disconnectSpotify.mockResolvedValue({ status: 'success' })

    localStorage.clear()
    sessionStorage.clear()
    window.history.replaceState({}, '', '/')

    vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined)
  })

  afterEach(() => {
    while (mountedWrappers.length) {
      const wrapper = mountedWrappers.pop()
      wrapper?.unmount()
    }
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useRealTimers()
    localStorage.clear()
    sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('renders Spotify details and disconnected state on mount', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Spotify')
    expect(wrapper.find('.icon-stub').attributes('data-icon')).toBe('spotify')
    expect(wrapper.find('.status-badge.gray').exists()).toBe(true)
    expect(wrapper.text()).toContain('Not connected to Spotify')
    expect(wrapper.find('.btn-connect').exists()).toBe(true)
    expect(apiMocks.getSpotifyStatus).toHaveBeenCalledTimes(1)
  })

  it('loads settings on mount when store is not loaded', async () => {
    settingsStoreMock.loaded = false

    mountComponent()
    await flushPromises()

    expect(settingsStoreMock.loadSettings).toHaveBeenCalledTimes(1)
  })

  it('shows connected state when backend reports authenticated user', async () => {
    apiMocks.getSpotifyStatus.mockResolvedValueOnce({ authenticated: true, username: 'alice' })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.status-badge.green').exists()).toBe(true)
    expect(wrapper.text()).toContain('Connected to Spotify')
    expect(wrapper.find('.btn-disconnect').exists()).toBe(true)
  })

  it('starts connect flow and opens cleaned login URL', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(apiMocks.createSpotifySession).toHaveBeenCalledTimes(1)
    expect(apiMocks.getSpotifyLoginUrl).toHaveBeenCalledWith('session-1')
    expect(localStorage.getItem('spotify_session_id')).toBe('session-1')
    expect(sessionStorage.getItem('spotify_auth_in_progress')).toBe('true')
    expect(window.open).toHaveBeenCalledWith(
      'https://accounts.spotify.com/authorize?foo=bar&x=1',
      'spotify_auth_window',
      'width=800,height=600',
    )
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
  })

  it('shows error when session creation returns no session id', async () => {
    apiMocks.createSpotifySession.mockResolvedValueOnce({})

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error: Failed to create authentication session')
    expect(sessionStorage.getItem('spotify_auth_in_progress')).toBeNull()
  })

  it('shows error when login URL payload is invalid', async () => {
    apiMocks.getSpotifyLoginUrl.mockResolvedValueOnce({ status: 'error', message: '' })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Could not get Spotify authorization URL')
    expect(sessionStorage.getItem('spotify_auth_in_progress')).toBeNull()
  })

  it('shows error when connect flow throws', async () => {
    apiMocks.createSpotifySession.mockRejectedValueOnce(new Error('network down'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error: network down')
    expect(sessionStorage.getItem('spotify_auth_in_progress')).toBeNull()
  })

  it('polling stores tokens on completed auth then marks connected', async () => {
    vi.useFakeTimers()
    apiMocks.pollSpotifyAuth.mockResolvedValueOnce({
      status: 'completed',
      token_data: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600,
      },
    })
    apiMocks.getSpotifyStatus
      .mockResolvedValueOnce({ authenticated: false })
      .mockResolvedValueOnce({ authenticated: true, username: 'alice' })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(apiMocks.storeSpotifyTokens).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
    })
    expect(wrapper.find('.btn-disconnect').exists()).toBe(true)
    expect(localStorage.getItem('spotify_session_id')).toBeNull()
  })

  it('polling keeps waiting while status is pending', async () => {
    vi.useFakeTimers()
    apiMocks.pollSpotifyAuth.mockResolvedValueOnce({ status: 'pending' })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(apiMocks.pollSpotifyAuth).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
  })

  it('polling stops with error payload', async () => {
    vi.useFakeTimers()
    apiMocks.pollSpotifyAuth.mockResolvedValueOnce({ status: 'error', error: 'Denied' })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Denied')
    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
  })

  it('polling catch branch reports authentication polling failure', async () => {
    vi.useFakeTimers()
    apiMocks.pollSpotifyAuth.mockRejectedValueOnce(new Error('poll failed'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Authentication polling failed')
    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
  })

  it('replaces existing poll interval when polling starts again', async () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const wrapper = mountComponent()
    await flushPromises()

    const setupState = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState as {
      startAuthPolling: (sessionId: string) => void
    }

    setupState.startAuthPolling('session-a')
    setupState.startAuthPolling('session-b')

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('returns early from polling when auth is not in progress', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const setupState = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState as {
      pollForTokens: (sessionId: string) => Promise<void>
    }

    await setupState.pollForTokens('session-1')

    expect(apiMocks.pollSpotifyAuth).toHaveBeenCalledTimes(0)
    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
  })

  it('handles token storage error payload from backend', async () => {
    vi.useFakeTimers()
    apiMocks.pollSpotifyAuth.mockResolvedValueOnce({
      status: 'completed',
      token_data: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600,
      },
    })
    apiMocks.storeSpotifyTokens.mockResolvedValueOnce({ status: 'error', error: 'store denied' })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('store denied')
  })

  it('handles token storage exceptions', async () => {
    vi.useFakeTimers()
    apiMocks.pollSpotifyAuth.mockResolvedValueOnce({
      status: 'completed',
      token_data: {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600,
      },
    })
    apiMocks.storeSpotifyTokens.mockRejectedValueOnce(new Error('store crashed'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Token storage failed')
  })

  it('abort clears auth state and storage', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    await wrapper.find('.btn-cancel').trigger('click')
    await flushPromises()

    expect(localStorage.getItem('spotify_session_id')).toBeNull()
    expect(sessionStorage.getItem('spotify_auth_in_progress')).toBeNull()
    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
    expect(wrapper.find('.btn-connect').exists()).toBe(true)
  })

  it('handles disconnect success and restores connect state', async () => {
    apiMocks.getSpotifyStatus.mockResolvedValueOnce({ authenticated: true, username: 'alice' })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    expect(apiMocks.disconnectSpotify).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.btn-connect').exists()).toBe(true)
  })

  it('handles disconnect API error payload', async () => {
    apiMocks.getSpotifyStatus.mockResolvedValueOnce({ authenticated: true, username: 'alice' })
    apiMocks.disconnectSpotify.mockResolvedValueOnce({ status: 'error', error: 'Nope' })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error disconnecting: Nope')
    expect(wrapper.find('.btn-disconnect').exists()).toBe(true)
  })

  it('handles disconnect thrown errors', async () => {
    apiMocks.getSpotifyStatus.mockResolvedValueOnce({ authenticated: true, username: 'alice' })
    apiMocks.disconnectSpotify.mockRejectedValueOnce(new Error('disconnect failed'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error: disconnect failed')
  })

  it('uses fallback disconnect error text when payload has no error message', async () => {
    apiMocks.getSpotifyStatus.mockResolvedValueOnce({ authenticated: true, username: 'alice' })
    apiMocks.disconnectSpotify.mockResolvedValueOnce({ status: 'error' })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Error disconnecting: Unknown error during disconnect.')
  })

  it('uses unknown fallback when disconnect throws non-Error value', async () => {
    apiMocks.getSpotifyStatus.mockResolvedValueOnce({ authenticated: true, username: 'alice' })
    apiMocks.disconnectSpotify.mockRejectedValueOnce('disconnect exploded')

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-disconnect').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Error: Unknown error')
  })

  it('expands settings and persists toggles', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.expand-caret').trigger('click')
    expect(wrapper.find('.settings-section').exists()).toBe(true)

    const toggles = wrapper.findAll('.toggle-switch-stub')
    await toggles[0].trigger('click')
    await toggles[1].trigger('click')
    await flushPromises()

    expect(settingsStoreMock.updateSpotifySettings).toHaveBeenCalledTimes(2)
    expect(settingsStoreMock.updateSpotifySettings).toHaveBeenCalledWith({
      controlPlayer: false,
      manageFavourites: false,
    })
  })

  it('handles settings save failures gracefully', async () => {
    settingsStoreMock.updateSpotifySettings.mockRejectedValueOnce(new Error('save failed'))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.expand-caret').trigger('click')
    await wrapper.findAll('.toggle-switch-stub')[0].trigger('click')
    await flushPromises()

    expect(settingsStoreMock.updateSpotifySettings).toHaveBeenCalledTimes(1)
  })

  it('shows status error state when initial status fetch fails', async () => {
    apiMocks.getSpotifyStatus.mockRejectedValueOnce(new Error('status failed'))

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.find('.status-badge.red').exists()).toBe(true)
    expect(wrapper.text()).toContain('Connection error')
    expect(wrapper.text()).toContain('Failed to check Spotify status. Please try again.')
  })

  it('handles connected status without username', async () => {
    apiMocks.getSpotifyStatus.mockResolvedValueOnce({ authenticated: true })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.status-badge.green').exists()).toBe(true)
    expect(wrapper.text()).toContain('Connected to Spotify')
  })

  it('resumes auth polling from stored session during status check', async () => {
    vi.useFakeTimers()
    localStorage.setItem('spotify_session_id', 'session-restore')

    const wrapper = mountComponent()
    await flushPromises()

    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(apiMocks.pollSpotifyAuth).toHaveBeenCalledWith('session-restore')
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
  })

  it('handles OAuth callback session_id and cleans URL', async () => {
    vi.useFakeTimers()
    window.history.pushState({}, '', '/?session_id=oauth-session')

    mountComponent()
    await flushPromises()

    expect(window.history.replaceState).toHaveBeenCalledWith({}, document.title, window.location.pathname)

    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(apiMocks.pollSpotifyAuth).toHaveBeenCalledWith('oauth-session')
  })

  it('aborts stale in-progress auth on mount with stored session flag', async () => {
    localStorage.setItem('spotify_session_id', 'stale-session')
    sessionStorage.setItem('spotify_auth_in_progress', 'true')

    const wrapper = mountComponent()
    await flushPromises()

    expect(localStorage.getItem('spotify_session_id')).toBeNull()
    expect(sessionStorage.getItem('spotify_auth_in_progress')).toBeNull()
    expect(wrapper.find('.btn-cancel').exists()).toBe(false)
  })

  it('stops polling on unmount', async () => {
    vi.useFakeTimers()

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(10000)

    expect(apiMocks.pollSpotifyAuth).toHaveBeenCalledTimes(0)
  })

  it('uses unknown fallback when connect flow throws non-Error value', async () => {
    apiMocks.createSpotifySession.mockRejectedValueOnce('boom')

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('.btn-connect').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error: Unknown error')
  })
})
