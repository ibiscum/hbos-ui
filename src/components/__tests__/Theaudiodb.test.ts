import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import Theaudiodb from '@/components/Theaudiodb.vue'

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(Theaudiodb, {
    props,
    global: {
      stubs: {
        ContentBox: {
          template: '<section class="content-box-stub"><slot /></section>',
        },
        Icon: {
          props: ['icon'],
          template: '<i class="icon-stub" :data-icon="icon" />',
        },
      },
    },
  })
}

describe('Theaudiodb.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ artists: [{ id: 112024 }] }),
      }),
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('renders defaults and forwards icon prop to Icon', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('TheAudioDB')
    expect(wrapper.text()).toContain(
      'TheAudioDB is used to retrieve additional artist images and biographies',
    )
    expect(wrapper.find('.icon-stub').attributes('data-icon')).toBe('tabler/database')
  })

  it('checks service status on mount with expected fetch contract', async () => {
    mountComponent()
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.theaudiodb.com/api/v1/artist.php?i=112024',
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('shows active status for a successful response', async () => {
    const wrapper = mountComponent({ title: 'Music Metadata' })
    await flushPromises()

    const status = wrapper.find('[role="status"]')
    expect(wrapper.find('.status-badge.green').exists()).toBe(true)
    expect(status.attributes('aria-label')).toBe('Music Metadata service status: Active')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('shows unavailable status and error details for HTTP failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    )

    const wrapper = mountComponent({ serviceKey: 'music-db' })
    await flushPromises()

    expect(wrapper.find('.status-badge.red').exists()).toBe(true)
    expect(wrapper.text()).toContain('Unavailable')
    expect(wrapper.text()).toContain('Failed to check status: HTTP 503')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[music-db] Service health check failed:',
      expect.any(Error),
    )
  })

  it('regression: reports timeout with explicit timeout message', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, init) => {
        const signal = init?.signal as AbortSignal

        return new Promise((_, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              const timeoutError = new Error('Request aborted')
              timeoutError.name = 'AbortError'
              reject(timeoutError)
            },
            { once: true },
          )
        })
      }),
    )

    const wrapper = mountComponent()

    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find('.status-badge.red').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to check status: Request timed out')
    expect(wrapper.find('.loading-section').exists()).toBe(false)
  })

  it('regression: new checks abort previous in-flight requests', async () => {
    const signals: AbortSignal[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn((_url, init) => {
        signals.push(init?.signal as AbortSignal)
        return new Promise(() => {
          // Keep requests in-flight so we can assert abort behavior.
        })
      }),
    )

    const wrapper = mountComponent()
    await nextTick()

    const exposed = wrapper.vm as { checkServiceStatus: () => Promise<void> }
    void exposed.checkServiceStatus()
    await nextTick()

    expect(signals).toHaveLength(2)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })

  it('regression: unmount aborts active request without error logging', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let capturedSignal: AbortSignal | null = null

    vi.stubGlobal(
      'fetch',
      vi.fn((_url, init) => {
        capturedSignal = init?.signal as AbortSignal

        return new Promise((_, reject) => {
          capturedSignal?.addEventListener(
            'abort',
            () => {
              const abortError = new Error('Request aborted')
              abortError.name = 'AbortError'
              reject(abortError)
            },
            { once: true },
          )
        })
      }),
    )

    const wrapper = mountComponent()
    wrapper.unmount()
    await flushPromises()

    expect((capturedSignal as AbortSignal | null)?.aborted ?? false).toBe(true)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
