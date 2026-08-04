import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import CrossoverDesignView from '../crossover-design.vue'

type UiFilter = {
  id: number
  icon: string
  text: string
  frequency: number
  gain: number
  Q: number
  enabled: boolean
}

function makeFilter(id: number, overrides: Partial<UiFilter> = {}): UiFilter {
  return {
    id,
    icon: 'peaking',
    text: '1000',
    frequency: 1000,
    gain: 0,
    Q: 0.71,
    enabled: true,
    ...overrides,
  }
}

const runtime = vi.hoisted(() => ({
  crossover: null as unknown as ReturnType<typeof buildCrossoverState>,
  bypass: null as unknown as ReturnType<typeof buildBypassState>,
}))

const mocks = vi.hoisted(() => ({
  addFilterOfType: vi.fn(async () => undefined),
  removeFilter: vi.fn(async () => undefined),
  toggleFilterEnabled: vi.fn(async () => undefined),
  incrementFilterFrequency: vi.fn(),
  decrementFilterFrequency: vi.fn(),
  incrementFilterGain: vi.fn(),
  decrementFilterGain: vi.fn(),
  widenFilterBand: vi.fn(),
  narrowFilterBand: vi.fn(),
  updateGenericCoeff: vi.fn(),
  onGraphUpdateFreqGain: vi.fn(),
  onGraphUpdateQ: vi.fn(),
  onGraphDragStart: vi.fn(),
  onGraphDragEnd: vi.fn(async () => undefined),

  initialize: vi.fn(async () => undefined),
  loadBackendCapabilities: vi.fn(async () => undefined),
  togglePairLink: vi.fn(async () => undefined),
  setChannelDelay: vi.fn(async () => undefined),
  setChannelLevel: vi.fn(async () => undefined),
  setChannelInvert: vi.fn(async () => undefined),
  setChannelSelectMode: vi.fn(async () => undefined),

  startBypass: vi.fn(),
  endBypass: vi.fn(),
}))

function buildCrossoverState(ref: <T>(value: T) => { value: T }) {
  const channelNames = ref(['iir_a', 'iir_b', 'iir_c', 'iir_d'])
  const activeChannel = ref('iir_a')
  const channelFilters = ref<Record<string, UiFilter[]>>({
    iir_a: [makeFilter(1, { frequency: 1200, text: '1200' })],
    iir_b: [makeFilter(1, { frequency: 1200, text: '1200' })],
    iir_c: [makeFilter(2, { frequency: 340, text: '340' })],
    iir_d: [],
  })
  const filters = ref(channelFilters.value.iir_a)
  const activeFilterId = ref<number | null>(1)
  const isDragging = ref(false)

  const backendCapabilities = ref({
    availableFilterBanks: [
      { name: 'iir_a', bankAddress: 'IIR_A' },
      { name: 'iir_b', bankAddress: 'IIR_B' },
      { name: 'iir_c', bankAddress: 'IIR_C' },
      { name: 'iir_d', bankAddress: 'IIR_D' },
    ],
  })
  const backendName = ref('Test Backend')
  const canAddFilterToCurrentChannel = ref(true)
  const currentChannelFilterInfo = ref({ currentFilterCount: 1, maxFilters: 8 })
  const isCurrentPairLinked = ref(false)

  const channelSettings = ref<Record<string, { delay: number; level: number; inverted: boolean; channelSelect: number }>>({
    iir_a: { delay: 0, level: 1, inverted: false, channelSelect: 0 },
    iir_b: { delay: 0, level: 1, inverted: false, channelSelect: 1 },
    iir_c: { delay: 96, level: 0.501187, inverted: true, channelSelect: 2 },
    iir_d: { delay: 0, level: 1, inverted: false, channelSelect: 1 },
  })

  const channelFeatures = ref<Record<string, {
    hasDelay: boolean
    hasLevel: boolean
    hasInvert: boolean
    hasChannelSelect: boolean
  }>>({
    iir_a: { hasDelay: true, hasLevel: true, hasInvert: true, hasChannelSelect: true },
    iir_b: { hasDelay: true, hasLevel: true, hasInvert: true, hasChannelSelect: true },
    iir_c: { hasDelay: true, hasLevel: true, hasInvert: true, hasChannelSelect: true },
    iir_d: { hasDelay: false, hasLevel: false, hasInvert: false, hasChannelSelect: false },
  })

  const getPairPartner = vi.fn((channel: string) => {
    if (channel === 'iir_a') return 'iir_b'
    if (channel === 'iir_b') return 'iir_a'
    if (channel === 'iir_c') return 'iir_d'
    if (channel === 'iir_d') return 'iir_c'
    return null
  })

  const setActiveChannel = vi.fn((channel: string) => {
    activeChannel.value = channel
    filters.value = channelFilters.value[channel] ?? []
    activeFilterId.value = filters.value[0]?.id ?? null
  })

  const getChannelDelayMs = vi.fn((channel: string) => {
    const raw = channelSettings.value[channel]?.delay ?? 0
    return raw / 48
  })

  const getChannelLevelDb = vi.fn((channel: string) => {
    const raw = channelSettings.value[channel]?.level ?? 1
    if (raw <= 0) return -60
    return 20 * Math.log10(raw)
  })

  return {
    channelNames,
    activeChannel,
    channelFilters,
    activeFilterId,
    isDragging,
    backendCapabilities,
    backendName,
    filters,
    canAddFilterToCurrentChannel,
    currentChannelFilterInfo,
    isCurrentPairLinked,
    getPairPartner,
    channelSettings,
    channelFeatures,

    initialize: mocks.initialize,
    loadBackendCapabilities: mocks.loadBackendCapabilities,
    togglePairLink: mocks.togglePairLink,
    setActiveChannel,

    addFilterOfType: mocks.addFilterOfType,
    removeFilter: mocks.removeFilter,
    toggleFilterEnabled: mocks.toggleFilterEnabled,
    incrementFilterFrequency: mocks.incrementFilterFrequency,
    decrementFilterFrequency: mocks.decrementFilterFrequency,
    incrementFilterGain: mocks.incrementFilterGain,
    decrementFilterGain: mocks.decrementFilterGain,
    widenFilterBand: mocks.widenFilterBand,
    narrowFilterBand: mocks.narrowFilterBand,
    updateGenericCoeff: mocks.updateGenericCoeff,

    onGraphUpdateFreqGain: mocks.onGraphUpdateFreqGain,
    onGraphUpdateQ: mocks.onGraphUpdateQ,
    onGraphDragStart: mocks.onGraphDragStart,
    onGraphDragEnd: mocks.onGraphDragEnd,

    setChannelDelay: mocks.setChannelDelay,
    setChannelLevel: mocks.setChannelLevel,
    setChannelInvert: mocks.setChannelInvert,
    setChannelSelectMode: mocks.setChannelSelectMode,
    getChannelDelayMs,
    getChannelLevelDb,

    SAMPLE_RATE: 48000,
  }
}

function buildBypassState(ref: <T>(value: T) => { value: T }) {
  return {
    isBypassed: ref(false),
    resolver: null as null | (() => string[]),
    startBypass: mocks.startBypass,
    endBypass: mocks.endBypass,
  }
}

vi.mock('@/composables/useCrossoverFilters', async () => {
  const { ref } = await import('vue')
  runtime.crossover = buildCrossoverState(ref)

  return {
    useCrossoverFilters: () => runtime.crossover,
  }
})

vi.mock('@/composables/useBypass', async () => {
  const { ref } = await import('vue')
  runtime.bypass = buildBypassState(ref)

  return {
    useBypass: (resolver: () => string[]) => {
      runtime.bypass.resolver = resolver
      return {
        isBypassed: runtime.bypass.isBypassed,
        startBypass: runtime.bypass.startBypass,
        endBypass: runtime.bypass.endBypass,
      }
    },
  }
})

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink', 'headerHasContentBelow'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name" :data-header-below="headerHasContentBelow ? \'yes\' : \'no\'"><slot /></section>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    emits: ['click', 'mousedown', 'mouseup', 'mouseleave', 'touchstart', 'touchend'],
    template: '<button class="icon-stub" :data-icon="icon" @click="$emit(\'click\')" @mousedown="$emit(\'mousedown\')" @mouseup="$emit(\'mouseup\')" @mouseleave="$emit(\'mouseleave\')" @touchstart="$emit(\'touchstart\')" @touchend="$emit(\'touchend\')" />',
  },
}))

vi.mock('@/components/FilterGraph.vue', () => ({
  default: {
    name: 'FilterGraph',
    props: ['filters', 'activeFilterId', 'showBandwidthLines', 'sampleRate'],
    emits: ['set-active-filter', 'update:freq-gain', 'update:q', 'drag-start', 'drag-end'],
    template: '<div class="filter-graph-stub" />',
  },
}))

vi.mock('@/components/speaker-eq/EqFilterItem.vue', () => ({
  default: {
    name: 'EqFilterItem',
    props: ['filter', 'isActive'],
    emits: ['select', 'remove', 'toggle-enabled', 'increment-frequency', 'decrement-frequency', 'increment-gain', 'decrement-gain', 'widen-band', 'narrow-band', 'update-generic-coeff'],
    template: '<article class="eq-filter-item-stub" :data-filter-id="filter.id" :data-active="isActive ? \'yes\' : \'no\'" />',
  },
}))

vi.mock('@/components/speaker-eq/AddFilterModal.vue', () => ({
  default: {
    name: 'AddFilterModal',
    props: ['open', 'filterTypes'],
    emits: ['close', 'add'],
    template: '<div v-if="open" class="add-filter-modal-stub"><button class="add-filter-confirm" @click="$emit(\'add\', \'lowpass\')">Add</button><button class="add-filter-close" @click="$emit(\'close\')">Close</button></div>',
  },
}))

vi.mock('@/components/speaker-eq/BackendInfoModal.vue', () => ({
  default: {
    name: 'BackendInfoModal',
    props: ['open', 'capabilities'],
    emits: ['close'],
    template: '<div v-if="open" class="backend-info-modal-stub"><button class="backend-modal-close" @click="$emit(\'close\')">Close</button></div>',
  },
}))

const mountView = () => mount(CrossoverDesignView)

describe('sound/crossover-design view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    runtime.crossover.activeChannel.value = 'iir_a'
    runtime.crossover.channelNames.value = ['iir_a', 'iir_b', 'iir_c', 'iir_d']
    runtime.crossover.channelFilters.value = {
      iir_a: [makeFilter(1, { frequency: 1200, text: '1200' })],
      iir_b: [makeFilter(1, { frequency: 1200, text: '1200' })],
      iir_c: [makeFilter(2, { frequency: 340, text: '340' })],
      iir_d: [],
    }
    runtime.crossover.filters.value = runtime.crossover.channelFilters.value.iir_a
    runtime.crossover.activeFilterId.value = 1
    runtime.crossover.canAddFilterToCurrentChannel.value = true
    runtime.crossover.currentChannelFilterInfo.value = { currentFilterCount: 1, maxFilters: 8 }
    runtime.crossover.isCurrentPairLinked.value = false
    runtime.crossover.backendName.value = 'Test Backend'
    runtime.crossover.channelFeatures.value.iir_a = {
      hasDelay: true,
      hasLevel: true,
      hasInvert: true,
      hasChannelSelect: true,
    }
    runtime.crossover.channelSettings.value.iir_a = {
      delay: 0,
      level: 1,
      inverted: false,
      channelSelect: 0,
    }
    runtime.crossover.channelSettings.value.iir_c = {
      delay: 96,
      level: 0.501187,
      inverted: true,
      channelSelect: 2,
    }

    runtime.bypass.isBypassed.value = false
    runtime.bypass.resolver = null
  })

  describe('unit coverage', () => {
    it('renders page shell with transformed channel title and sound back-link', async () => {
      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toContain('Crossover Design — Channel A')
      expect(page.attributes('data-back-link')).toBe('sound')
      expect(page.attributes('data-header-below')).toBe('yes')
      expect(mocks.initialize).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('renders backend metadata, graph, tabs and filter items', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Test Backend')
      expect(wrapper.text()).toContain('1/8 filters')
      expect(wrapper.find('.filter-graph-stub').exists()).toBe(true)
      expect(wrapper.findAll('.tab')).toHaveLength(4)
      expect(wrapper.findAll('.eq-filter-item-stub')).toHaveLength(1)
      wrapper.unmount()
    })

    it('opens add-filter modal only when channel can accept more filters', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.add-filter-item').trigger('click')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(true)

      await wrapper.get('.add-filter-close').trigger('click')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(false)

      runtime.crossover.canAddFilterToCurrentChannel.value = false
      runtime.crossover.currentChannelFilterInfo.value = { currentFilterCount: 8, maxFilters: 8 }
      await nextTick()

      await wrapper.get('.add-filter-item').trigger('click')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(false)
      expect(wrapper.text()).toContain('Maximum Filters Reached')
      wrapper.unmount()
    })

    it('routes add-filter modal confirmation through addFilterOfType and closes modal', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.add-filter-item').trigger('click')
      await wrapper.get('.add-filter-confirm').trigger('click')
      await flushPromises()

      expect(mocks.addFilterOfType).toHaveBeenCalledWith('lowpass')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('regression coverage', () => {
    it('space key bypass shortcut is suppressed while a modal is open', async () => {
      const wrapper = mountView()
      await flushPromises()

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
      expect(mocks.startBypass).toHaveBeenCalledTimes(1)
      expect(mocks.endBypass).toHaveBeenCalledTimes(1)

      await wrapper.get('.add-filter-item').trigger('click')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
      expect(mocks.startBypass).toHaveBeenCalledTimes(1)
      expect(mocks.endBypass).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('escape closes add-filter modal first, then backend-info modal', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.add-filter-item').trigger('click')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(false)

      await wrapper.get('.backend-name').trigger('click')
      expect(wrapper.find('.backend-info-modal-stub').exists()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()
      expect(wrapper.find('.backend-info-modal-stub').exists()).toBe(false)
      wrapper.unmount()
    })

    it('reset channel settings uses parity-based default input select mode', async () => {
      runtime.crossover.activeChannel.value = 'iir_c'
      runtime.crossover.filters.value = runtime.crossover.channelFilters.value.iir_c

      const wrapper = mountView()
      await flushPromises()

      const resetButton = wrapper
        .findAll('.toggle-btn')
        .find((btn) => btn.text() === 'Reset')
      expect(resetButton).toBeTruthy()

      await resetButton!.trigger('click')
      await flushPromises()

      expect(mocks.setChannelDelay).toHaveBeenCalledWith('iir_c', 0)
      expect(mocks.setChannelLevel).toHaveBeenCalledWith('iir_c', 0)
      expect(mocks.setChannelInvert).toHaveBeenCalledWith('iir_c', false)
      expect(mocks.setChannelSelectMode).toHaveBeenCalledWith('iir_c', 0)
      wrapper.unmount()
    })

    it('step controls clamp delay and level to safe ranges', async () => {
      runtime.crossover.activeChannel.value = 'iir_a'
      runtime.crossover.channelSettings.value.iir_a.delay = 480
      runtime.crossover.channelSettings.value.iir_a.level = Math.pow(10, 6 / 20)

      const wrapper = mountView()
      await flushPromises()

      const stepButtons = wrapper.findAll('.channel-settings .step-btn')
      expect(stepButtons.length).toBeGreaterThanOrEqual(4)

      await stepButtons[1].trigger('click')
      await stepButtons[3].trigger('click')
      await flushPromises()

      expect(mocks.setChannelDelay).toHaveBeenCalledWith('iir_a', 10)
      expect(mocks.setChannelLevel).toHaveBeenCalledWith('iir_a', 6)
      wrapper.unmount()
    })

    it('watches active channel changes and reloads backend capabilities', async () => {
      const wrapper = mountView()
      await flushPromises()

      runtime.crossover.activeChannel.value = 'iir_b'
      await nextTick()
      await flushPromises()

      expect(mocks.loadBackendCapabilities).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('unregisters keyboard listeners on unmount to avoid duplicate bypass handling', async () => {
      const wrapper = mountView()
      await flushPromises()

      wrapper.unmount()

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))

      expect(mocks.startBypass).not.toHaveBeenCalled()
      expect(mocks.endBypass).not.toHaveBeenCalled()
    })
  })
})
