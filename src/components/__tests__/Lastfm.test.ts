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
          template: '<button class="toggle-switch-stub" :disabled="disabled" />',
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
    expect(wrapper.text()).toContain('Error: MissingAuthPayload')
    expect(wrapper.find('.btn-connect').attributes('disabled')).toBeUndefined()
    expect(sessionStorage.getItem('lastfm_auth_in_progress')).toBeNull()
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

  it('regression: resumes auth session from stored token during status check', async () => {
    localStorage.setItem('lastfm_request_token', 'stored-token')

    const wrapper = mountComponent()
    await flushPromises()

    expect(apiMocks.prepareLastFMAuthCompletion).toHaveBeenCalledWith('stored-token')
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
  })
})
