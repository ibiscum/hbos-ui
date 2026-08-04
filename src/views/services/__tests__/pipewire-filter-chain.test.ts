import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import PipewireFilterChainView from '../pipewire-filter-chain.vue'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const mocks = vi.hoisted(() => {
  const getFilterChain = vi.fn()

  const renderState = {
    error: null as Error | null,
  }

  const renderDot = vi.fn((dot: string) => {
    if (renderState.error) {
      throw renderState.error
    }
    return dot
  })

  const graphviz = vi.fn(() => {
    const chain = {
      fit: vi.fn().mockReturnThis(),
      width: vi.fn().mockReturnThis(),
      height: vi.fn().mockReturnThis(),
      zoom: vi.fn().mockReturnThis(),
      renderDot,
    }
    return chain
  })

  return {
    getFilterChain,
    graphviz,
    renderDot,
    renderState,
  }
})

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/api/filterchain', () => ({
  getFilterChain: mocks.getFilterChain,
}))

vi.mock('d3-graphviz', () => ({
  graphviz: mocks.graphviz,
}))

const mountView = () => mount(PipewireFilterChainView)

describe('services/pipewire-filter-chain view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.renderState.error = null

    mocks.getFilterChain.mockResolvedValue({
      status: 'success',
      data: 'digraph pipewire { "A" -> "B"; }',
    })
  })

  describe('unit coverage', () => {
    it('renders page shell with services back link and title', async () => {
      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('PipeWire Filter Chain')
      expect(page.attributes('data-back-link')).toBe('services')
      expect(wrapper.text()).toContain('PipeWire Graph Visualization')
    })

    it('shows loading state while filterchain request is in flight', async () => {
      const pending = deferred<{ status: 'success'; data: string }>()
      mocks.getFilterChain.mockReturnValueOnce(pending.promise)

      const wrapper = mountView()
      await Promise.resolve()

      expect(wrapper.text()).toContain('Loading filter chain...')

      pending.resolve({ status: 'success', data: 'digraph { }' })
      await flushPromises()

      expect(wrapper.text()).toContain('Graph View')
    })

    it('renders empty state when API returns empty DOT data', async () => {
      mocks.getFilterChain.mockResolvedValueOnce({ status: 'success', data: '' })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('No filter chain configuration found.')
      expect(wrapper.find('.graph-svg-container').exists()).toBe(false)
    })

    it('shows raw view content when toggled to raw dot', async () => {
      const wrapper = mountView()
      await flushPromises()

      const rawButton = wrapper
        .findAll('.view-button')
        .find((button) => button.text() === 'Raw DOT')
      expect(rawButton).toBeDefined()

      await rawButton!.trigger('click')
      await flushPromises()

      expect(wrapper.find('.filter-chain-text pre').text()).toContain('digraph pipewire')
    })
  })

  describe('regression coverage', () => {
    it('auto-renders graph after successful load once loading is complete', async () => {
      mountView()
      await flushPromises()

      expect(mocks.graphviz).toHaveBeenCalledTimes(1)
      expect(mocks.renderDot).toHaveBeenCalledWith('digraph pipewire { "A" -> "B"; }')
    })

    it('re-renders graph when switching from raw back to graph view', async () => {
      const wrapper = mountView()
      await flushPromises()

      const rawButton = wrapper
        .findAll('.view-button')
        .find((button) => button.text() === 'Raw DOT')
      const graphButton = wrapper
        .findAll('.view-button')
        .find((button) => button.text() === 'Graph View')

      expect(rawButton).toBeDefined()
      expect(graphButton).toBeDefined()

      await rawButton!.trigger('click')
      await flushPromises()
      await graphButton!.trigger('click')
      await flushPromises()

      expect(mocks.graphviz).toHaveBeenCalledTimes(2)
      expect(mocks.renderDot).toHaveBeenCalledTimes(2)
    })

    it('shows API error state and retries successfully', async () => {
      mocks.getFilterChain
        .mockResolvedValueOnce({ status: 'error', message: 'backend unavailable' })
        .mockResolvedValueOnce({ status: 'success', data: 'digraph pipewire { "X" -> "Y"; }' })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('backend unavailable')
      expect(wrapper.find('.retry-button').exists()).toBe(true)

      await wrapper.get('.retry-button').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Graph View')
      expect(mocks.getFilterChain).toHaveBeenCalledTimes(2)
    })

    it('shows thrown fetch error message in error state', async () => {
      mocks.getFilterChain.mockRejectedValueOnce(new Error('request failed'))

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('request failed')
      expect(wrapper.find('.graph-card').exists()).toBe(false)
    })

    it('surfaces graph render errors and supports retry render', async () => {
      mocks.renderState.error = new Error('dot parse failed')

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('dot parse failed')

      mocks.renderState.error = null
      const retryRenderButton = wrapper
        .findAll('.retry-button')
        .find((button) => button.text() === 'Retry Render')
      expect(retryRenderButton).toBeDefined()

      await retryRenderButton!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).not.toContain('dot parse failed')
      expect(mocks.renderDot).toHaveBeenCalledTimes(2)
    })
  })
})
