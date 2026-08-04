import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import SpeakerEqualizerView from '../speaker-equalizer.vue'

const runtime = vi.hoisted(() => ({
  routeQuery: {} as Record<string, unknown>,
  eq: null as unknown as ReturnType<typeof buildEqState>,
  bypass: null as unknown as ReturnType<typeof buildBypassState>,
  roomEq: null as unknown as ReturnType<typeof buildRoomEqState>,
}))

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(async () => undefined),
  loadBackendCapabilities: vi.fn(async () => undefined),
  setActiveChannel: vi.fn(),
  toggleChannelMode: vi.fn(),
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

  startBypass: vi.fn(),
  endBypass: vi.fn(),

  saveEQSettings: vi.fn(),
  loadEQSettings: vi.fn(),

  loadRoomEQSettings: vi.fn(async () => undefined),
  loadSelectedRoomEQConfig: vi.fn(async () => undefined),
}))

function makeFilter(id: number, overrides: Partial<any> = {}) {
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

function buildEqState(ref: <T>(value: T) => { value: T }, computed: <T>(fn: () => T) => { readonly value: T }) {
  const channelNames = ref(['left', 'right'])
  const activeChannel = ref('left')
  const channelMode = ref<'both' | 'individual'>('individual')
  const channelFilters = ref<Record<string, any[]>>({
    left: [makeFilter(1, { frequency: 1200, text: '1200' })],
    right: [makeFilter(2, { frequency: 900, text: '900' })],
  })
  const activeFilterId = ref<number | null>(1)
  const isDragging = ref(false)
  const backendCapabilities = ref({ availableFilterBanks: [{ name: 'left' }, { name: 'right' }] })
  const backendName = ref('Mock EQ Backend')
  const bankAddresses = ref<Record<string, string>>({ left: 'EQ_LEFT', right: 'EQ_RIGHT' })
  const canAddFilterToCurrentChannel = ref(true)
  const currentChannelFilterInfo = ref({ currentFilterCount: 1, maxFilters: 8 })
  const isCurrentPairLinked = computed(() => channelMode.value === 'both')
  const filters = computed(() => channelFilters.value[activeChannel.value] ?? [])

  const setActiveChannel = vi.fn((channel: string) => {
    activeChannel.value = channel
    activeFilterId.value = (channelFilters.value[channel] ?? [])[0]?.id ?? null
    mocks.setActiveChannel(channel)
  })

  const toggleChannelMode = vi.fn(() => {
    channelMode.value = channelMode.value === 'both' ? 'individual' : 'both'
    mocks.toggleChannelMode()
  })

  const addFilterOfType = vi.fn(async (type: string) => {
    mocks.addFilterOfType(type)
    channelFilters.value[activeChannel.value] = [
      ...channelFilters.value[activeChannel.value],
      makeFilter(Date.now(), { icon: type, text: 'New' }),
    ]
  })

  return {
    channelNames,
    activeChannel,
    channelMode,
    channelFilters,
    activeFilterId,
    isDragging,
    backendCapabilities,
    backendName,
    bankAddresses,
    filters,
    canAddFilterToCurrentChannel,
    currentChannelFilterInfo,
    isCurrentPairLinked,
    initialize: mocks.initialize,
    loadBackendCapabilities: mocks.loadBackendCapabilities,
    setActiveChannel,
    toggleChannelMode,
    addFilterOfType,
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
    SAMPLE_RATE: 48000,
  }
}

function buildBypassState(ref: <T>(value: T) => { value: T }) {
  return {
    isBypassed: ref(false),
    startBypass: mocks.startBypass,
    endBypass: mocks.endBypass,
  }
}

function buildRoomEqState(ref: <T>(value: T) => { value: T }) {
  return {
    showRoomEQModal: ref(false),
    loadingRoomEQConfigs: ref(false),
    roomEQConfigs: ref<{ key: string; data: { name: string } }[]>([
      { key: 'correction-filters.eq-a', data: { name: 'Room EQ A' } },
    ]),
    loadRoomEQSettings: mocks.loadRoomEQSettings,
    loadSelectedRoomEQConfig: mocks.loadSelectedRoomEQConfig,
  }
}

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: runtime.routeQuery }),
}))

vi.mock('@/composables/useEqFilters', async () => {
  const { ref, computed } = await import('vue')
  runtime.eq = buildEqState(ref, computed)
  return {
    useEqFilters: () => runtime.eq,
  }
})

vi.mock('@/composables/useBypass', async () => {
  const { ref } = await import('vue')
  runtime.bypass = buildBypassState(ref)
  return {
    useBypass: () => runtime.bypass,
  }
})

vi.mock('@/composables/useEqFileIO', () => ({
  useEqFileIO: () => ({
    saveEQSettings: mocks.saveEQSettings,
    loadEQSettings: mocks.loadEQSettings,
  }),
}))

vi.mock('@/composables/useRoomEQ', async () => {
  const { ref } = await import('vue')
  runtime.roomEq = buildRoomEqState(ref)
  return {
    useRoomEQ: () => runtime.roomEq,
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
    template: '<div v-if="open" class="add-filter-modal-stub"><button class="add-filter-confirm" @click="$emit(\'add\', \'peaking\')">Add</button><button class="add-filter-close" @click="$emit(\'close\')">Close</button></div>',
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

vi.mock('@/components/speaker-eq/RoomEqLoaderModal.vue', () => ({
  default: {
    name: 'RoomEqLoaderModal',
    props: ['open', 'loading', 'configs'],
    emits: ['close', 'load'],
    template: '<div v-if="open" class="room-eq-loader-modal-stub"><button class="room-eq-load" @click="$emit(\'load\', configs[0], \'both\')">Load</button><button class="room-eq-close" @click="$emit(\'close\')">Close</button></div>',
  },
}))

const mountView = () => mount(SpeakerEqualizerView)

describe('sound/speaker-equalizer view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runtime.routeQuery = {}

    runtime.eq.activeChannel.value = 'left'
    runtime.eq.channelMode.value = 'individual'
    runtime.eq.channelFilters.value = {
      left: [makeFilter(1, { frequency: 1200, text: '1200' })],
      right: [makeFilter(2, { frequency: 900, text: '900' })],
    }
    runtime.eq.activeFilterId.value = 1
    runtime.eq.canAddFilterToCurrentChannel.value = true
    runtime.eq.currentChannelFilterInfo.value = { currentFilterCount: 1, maxFilters: 8 }
    runtime.eq.backendName.value = 'Mock EQ Backend'

    runtime.roomEq.showRoomEQModal.value = false
    runtime.roomEq.loadingRoomEQConfigs.value = false
    runtime.roomEq.roomEQConfigs.value = [{ key: 'correction-filters.eq-a', data: { name: 'Room EQ A' } }]

    runtime.bypass.isBypassed.value = false
  })

  describe('unit coverage', () => {
    it('renders page shell, backend metadata, tabs, graph, and filter entries', async () => {
      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('Speaker Equalizer Left')
      expect(page.attributes('data-back-link')).toBe('sound')
      expect(page.attributes('data-header-below')).toBe('yes')

      expect(wrapper.text()).toContain('Mock EQ Backend')
      expect(wrapper.text()).toContain('1/8 filters')
      expect(wrapper.find('.filter-graph-stub').exists()).toBe(true)
      expect(wrapper.findAll('.tab')).toHaveLength(2)
      expect(wrapper.findAll('.eq-filter-item-stub')).toHaveLength(1)
      expect(mocks.initialize).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })

    it('opens add-filter modal and delegates add action to composable', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.add-filter-item').trigger('click')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(true)

      await wrapper.get('.add-filter-confirm').trigger('click')
      await flushPromises()

      expect(mocks.addFilterOfType).toHaveBeenCalledWith('peaking')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(false)

      wrapper.unmount()
    })

    it('loads room EQ modal via header icon and delegates load selection', async () => {
      const wrapper = mountView()
      await flushPromises()

      const roomEqButton = wrapper.findAll('.icon-stub').find((btn) => btn.attributes('data-icon') === 'tabler/armchair')
      expect(roomEqButton).toBeTruthy()

      await roomEqButton!.trigger('click')
      expect(mocks.loadRoomEQSettings).toHaveBeenCalledTimes(1)

      runtime.roomEq.showRoomEQModal.value = true
      await flushPromises()

      await wrapper.get('.room-eq-load').trigger('click')
      await flushPromises()

      expect(mocks.loadSelectedRoomEQConfig).toHaveBeenCalledWith(
        { key: 'correction-filters.eq-a', data: { name: 'Room EQ A' } },
        'both',
      )

      wrapper.unmount()
    })

    it('applies room EQ query parameters on mount when matching config exists', async () => {
      runtime.routeQuery = {
        applyRoomEQ: 'correction-filters.eq-a',
        channel: 'right',
      }

      const wrapper = mountView()
      await flushPromises()

      expect(mocks.loadRoomEQSettings).toHaveBeenCalledTimes(1)
      expect(mocks.loadSelectedRoomEQConfig).toHaveBeenCalledWith(
        { key: 'correction-filters.eq-a', data: { name: 'Room EQ A' } },
        'right',
      )

      wrapper.unmount()
    })
  })

  describe('regression coverage', () => {
    it('escape closes add-filter modal before backend and room-eq modals', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.add-filter-item').trigger('click')
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(wrapper.find('.add-filter-modal-stub').exists()).toBe(false)

      await wrapper.get('.backend-name').trigger('click')
      expect(wrapper.find('.backend-info-modal-stub').exists()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(wrapper.find('.backend-info-modal-stub').exists()).toBe(false)

      runtime.roomEq.showRoomEQModal.value = true
      await flushPromises()
      expect(wrapper.find('.room-eq-loader-modal-stub').exists()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(wrapper.find('.room-eq-loader-modal-stub').exists()).toBe(false)

      wrapper.unmount()
    })

    it('suppresses space bypass start and end while room-eq modal is open', async () => {
      const wrapper = mountView()
      await flushPromises()

      runtime.roomEq.showRoomEQModal.value = true
      await flushPromises()

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))

      expect(mocks.startBypass).not.toHaveBeenCalled()
      expect(mocks.endBypass).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('refreshes backend capabilities when active channel changes', async () => {
      const wrapper = mountView()
      await flushPromises()

      runtime.eq.activeChannel.value = 'right'
      await flushPromises()

      expect(mocks.loadBackendCapabilities).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })

    it('removes keyboard listeners on unmount', async () => {
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
