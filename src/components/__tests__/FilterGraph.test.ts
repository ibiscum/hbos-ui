import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import FilterGraph from '@/components/FilterGraph.vue'

const bandwidthState = vi.hoisted(() => ({
  start: null as ReturnType<typeof ref<number | null>> | null,
  end: null as ReturnType<typeof ref<number | null>> | null,
}))

vi.mock('@/composables/useBandwidthLines', async () => {
  const vue = await import('vue')
  if (!bandwidthState.start) bandwidthState.start = vue.ref<number | null>(900)
  if (!bandwidthState.end) bandwidthState.end = vue.ref<number | null>(1100)
  return {
    useBandwidthLines: (currentFilter: { value: { id: number } }) => {
      // Read the active filter so FilterGraph currentFilter fallback branches are executed in tests.
      void currentFilter.value.id
      return {
        activeFilterBandwidthStart: bandwidthState.start,
        activeFilterBandwidthEnd: bandwidthState.end,
      }
    },
  }
})

function makeFilter(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    icon: 'peaking',
    text: 'f1',
    frequency: 1000,
    gain: 3,
    Q: 1,
    enabled: true,
    ...overrides,
  }
}

function mountGraph(props: Record<string, unknown> = {}) {
  return mount(FilterGraph, {
    attachTo: document.body,
    props: {
      filters: [makeFilter()],
      activeFilterId: 1,
      showBandwidthLines: true,
      sampleRate: 48000,
      ...props,
    },
  })
}

function setSvgRect(wrapper: ReturnType<typeof mountGraph>) {
  const svg = wrapper.get('svg').element as SVGSVGElement
  const graph = wrapper.get('.graph').element as HTMLDivElement
  Object.defineProperty(graph, 'offsetWidth', {
    configurable: true,
    value: 900,
  })
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 900,
    bottom: 500,
    width: 900,
    height: 500,
    toJSON: () => ({}),
  })
  window.dispatchEvent(new Event('resize'))
}

function getPlotMousePosition(wrapper: ReturnType<typeof mountGraph>, selector: string) {
  const element = wrapper.get(selector)
  const x = Number(element.attributes('cx') ?? element.attributes('x1'))
  const y = Number(element.attributes('cy') ?? 200)
  return {
    clientX: 50 + x,
    clientY: 10 + y,
  }
}

describe('FilterGraph.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.style.userSelect = ''
    if (bandwidthState.start) bandwidthState.start.value = 900
    if (bandwidthState.end) bandwidthState.end.value = 1100
  })

  it('renders baseline when there are no filters and no active graph', () => {
    const wrapper = mountGraph({ filters: [], activeFilterId: null })

    const dashedBaseline = wrapper.find('line[stroke="#999"]')
    expect(dashedBaseline.exists()).toBe(true)
    expect(wrapper.find('path[stroke="#e11e4a"]').exists()).toBe(false)
    expect(wrapper.find('path[stroke="#00b8ff"]').exists()).toBe(false)
  })

  it('renders combined and active filter paths when active enabled filter exists', () => {
    const wrapper = mountGraph()

    expect(wrapper.find('path[stroke="#e11e4a"]').exists()).toBe(true)
    expect(wrapper.find('path[stroke="#00b8ff"]').exists()).toBe(true)
    expect(wrapper.find('path[fill="rgba(0, 184, 255, 0.1)"]').exists()).toBe(true)
  })

  it('excludes generic_normalized filters from node hit targets', () => {
    const wrapper = mountGraph({
      filters: [
        makeFilter({ id: 1, icon: 'peaking' }),
        makeFilter({ id: 2, icon: 'generic_normalized', frequency: 2000, enabled: false }),
      ],
    })

    const hitAreas = wrapper.findAll('circle[r="12"]')
    const nodes = wrapper.findAll('circle[r="6"]')

    expect(hitAreas).toHaveLength(1)
    expect(nodes).toHaveLength(1)
  })

  it('emits drag lifecycle and freq/gain updates when dragging a node', async () => {
    const wrapper = mountGraph()
    setSvgRect(wrapper)

    const dragHandle = wrapper.findAll('circle[r="12"]')[0]
    const dragStartPos = getPlotMousePosition(wrapper, 'circle[r="12"]')
    await dragHandle.trigger('mousedown', dragStartPos)

    expect(wrapper.emitted('set-active-filter')?.[0]).toEqual([1])
    expect(wrapper.emitted('drag-start')?.[0]).toEqual([1])
    expect(document.body.style.userSelect).toBe('none')

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: dragStartPos.clientX + 40, clientY: dragStartPos.clientY + 20 }))

    const updates = wrapper.emitted('update:freq-gain')
    expect(updates?.length).toBeGreaterThan(0)
    expect(updates?.[0]?.[0]).toMatchObject({ id: 1 })

    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(wrapper.emitted('drag-end')?.[0]).toEqual([1])
    expect(document.body.style.userSelect).toBe('')
  })

  it('does not emit drag-end when activeFilterId is null', async () => {
    const wrapper = mountGraph({ activeFilterId: null })
    setSvgRect(wrapper)

    const dragHandle = wrapper.findAll('circle[r="12"]')[0]
    await dragHandle.trigger('mousedown', { clientX: 200, clientY: 200 })
    await wrapper.get('.graph').trigger('mouseup')

    expect(wrapper.emitted('drag-end')).toBeUndefined()
  })

  it('returns early when bandwidth drag starts without an active filter id', async () => {
    const wrapper = mountGraph({ activeFilterId: null })
    setSvgRect(wrapper)

    const bandwidthHandles = wrapper.findAll('line[stroke="transparent"]')
    const startPos = getPlotMousePosition(wrapper, 'line[stroke="transparent"]')
    await bandwidthHandles[0].trigger('mousedown', startPos)

    expect(wrapper.emitted('update:q')).toBeUndefined()
    expect(document.body.style.userSelect).toBe('')
  })

  it('updates q while dragging bandwidth start and end handles', async () => {
    const wrapper = mountGraph()
    setSvgRect(wrapper)

    const bandwidthHandles = wrapper.findAll('line[stroke="transparent"]')
    expect(bandwidthHandles).toHaveLength(2)

    const startPos = getPlotMousePosition(wrapper, 'line[stroke="transparent"]')
    await bandwidthHandles[0].trigger('mousedown', startPos)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: startPos.clientX - 20, clientY: startPos.clientY }))

    const endX = Number(bandwidthHandles[1].attributes('x1'))
    const endPos = { clientX: 50 + endX, clientY: startPos.clientY }
    await bandwidthHandles[1].trigger('mousedown', endPos)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: endPos.clientX + 20, clientY: endPos.clientY }))
    document.dispatchEvent(new MouseEvent('mouseup'))

    const qUpdates = wrapper.emitted('update:q')
    expect(qUpdates?.length).toBeGreaterThanOrEqual(2)
    expect(qUpdates?.[0]?.[0]).toMatchObject({ id: 1 })
    expect(wrapper.emitted('drag-end')?.length).toBeGreaterThanOrEqual(1)
  })

  it('returns early for bandwidth drag when active filter is missing', async () => {
    const wrapper = mountGraph({
      filters: [makeFilter({ id: 2 })],
      activeFilterId: 1,
    })
    setSvgRect(wrapper)

    const bandwidthHandles = wrapper.findAll('line[stroke="transparent"]')
    const startPos = getPlotMousePosition(wrapper, 'line[stroke="transparent"]')
    await bandwidthHandles[0].trigger('mousedown', startPos)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: startPos.clientX - 20, clientY: startPos.clientY }))

    expect(wrapper.emitted('update:q')).toBeUndefined()
  })

  it('uses currentFilter fallback when active id does not exist', () => {
    const wrapper = mountGraph({
      filters: [makeFilter({ id: 7 })],
      activeFilterId: 999,
    })

    expect(wrapper.find('path[stroke="#00b8ff"]').exists()).toBe(false)
    expect(wrapper.findAll('line[stroke="transparent"]')).toHaveLength(2)
  })

  it('updates cursor to grab when hovering near a filter node', async () => {
    const wrapper = mountGraph()
    setSvgRect(wrapper)

    const pos = getPlotMousePosition(wrapper, 'circle[r="12"]')
    await wrapper.get('.graph').trigger('mousemove', pos)

    expect(wrapper.get('svg').element.style.cursor).toBe('grab')
  })

  it('updates cursor to ew-resize near bandwidth boundaries', async () => {
    const wrapper = mountGraph({
      filters: [makeFilter({ frequency: 100 })],
      activeFilterId: 1,
    })
    setSvgRect(wrapper)

    const x1 = Number(wrapper.findAll('line[stroke="transparent"]')[0].attributes('x1'))
    await wrapper.get('.graph').trigger('mousemove', { clientX: 50 + x1, clientY: 200 })

    expect(wrapper.get('svg').element.style.cursor).toBe('ew-resize')
  })

  it('updates cursor to ew-resize near the end bandwidth boundary', async () => {
    const wrapper = mountGraph()
    setSvgRect(wrapper)

    const endX = Number(wrapper.findAll('line[stroke="transparent"]')[1].attributes('x1'))
    await wrapper.get('.graph').trigger('mousemove', { clientX: 50 + endX, clientY: 200 })

    expect(wrapper.get('svg').element.style.cursor).toBe('ew-resize')
  })

  it('keeps default cursor away from filter nodes and bandwidth boundaries', async () => {
    const wrapper = mountGraph()
    setSvgRect(wrapper)

    await wrapper.get('.graph').trigger('mousemove', { clientX: 50 + 10, clientY: 10 + 10 })

    expect(wrapper.get('svg').element.style.cursor).toBe('default')
  })

  it('formats axis labels in Hz and kHz', () => {
    const wrapper = mountGraph()

    const labels = wrapper.findAll('.x-axis-labels text').map((n) => n.text())
    expect(labels.some((text) => text.endsWith('Hz'))).toBe(true)
    expect(labels.some((text) => text.endsWith('kHz'))).toBe(true)
  })

  it('attaches resize listener on mount and removes listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeWindowSpy = vi.spyOn(window, 'removeEventListener')
    const removeDocSpy = vi.spyOn(document, 'removeEventListener')

    const wrapper = mountGraph()

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    wrapper.unmount()

    expect(removeWindowSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeDocSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeDocSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })
})
