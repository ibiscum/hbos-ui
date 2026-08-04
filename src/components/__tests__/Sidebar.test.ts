import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterLinkStub, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import Sidebar from '@/components/Sidebar.vue'

const mockState = vi.hoisted(() => ({
  hasQueue: true,
  vuMeterEnabled: true,
  isPi5OrHigher: true,
}))

vi.mock('@/stores/player', async () => {
  const { defineStore } = await import('pinia')
  const { ref } = await import('vue')

  return {
    usePlayerStore: defineStore('player', () => {
      const playerCapabilities = ref({ hasQueue: mockState.hasQueue })
      return { playerCapabilities }
    }),
  }
})

vi.mock('@/stores/settings', async () => {
  const { defineStore } = await import('pinia')
  const { ref } = await import('vue')

  return {
    useSettingsStore: defineStore('settings', () => {
      const getVuMeterEnabled = ref(mockState.vuMeterEnabled)
      const isPi5OrHigher = ref(mockState.isPi5OrHigher)
      return { getVuMeterEnabled, isPi5OrHigher }
    }),
  }
})

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<span class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/SongControlInfo.vue', () => ({
  default: {
    name: 'SongControlInfo',
    template: '<div class="song-control-info-stub" />',
  },
}))

vi.mock('@/components/VuMeter.vue', () => ({
  default: {
    name: 'VuMeter',
    template: '<div class="vu-meter-stub" />',
  },
}))

const mountSidebar = (props: Record<string, unknown> = {}) => {
  return mount(Sidebar, {
    props,
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  })
}

describe('Sidebar.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockState.hasQueue = true
    mockState.vuMeterEnabled = true
    mockState.isPi5OrHigher = true
  })

  it('renders sidebar root and logos', () => {
    const wrapper = mountSidebar()

    expect(wrapper.find('.sidebar').exists()).toBe(true)
    expect(wrapper.get('.sidebar-logo img').attributes('src')).toContain('images/logo.svg')
    expect(wrapper.get('.sidebar-logo-small img').attributes('src')).toContain('images/logo-small.svg')
  })

  it('renders mobile song controls by default', () => {
    const wrapper = mountSidebar()

    expect(wrapper.find('.sidebar-controls').exists()).toBe(true)
    expect(wrapper.find('.song-control-info-stub').exists()).toBe(true)
  })

  it('regression: hides mobile song controls when isPlayerControls is false', () => {
    const wrapper = mountSidebar({ isPlayerControls: false })

    expect(wrapper.find('.sidebar-controls').exists()).toBe(false)
    expect(wrapper.find('.song-control-info-stub').exists()).toBe(false)
  })

  it('renders top-level navigation groups and expected labels', () => {
    const wrapper = mountSidebar()

    expect(wrapper.findAll('.nav-item__parent')).toHaveLength(4)
    expect(wrapper.text()).toContain('Now Playing')
    expect(wrapper.text()).toContain('Music Library')
    expect(wrapper.text()).toContain('Sound')
    expect(wrapper.text()).toContain('Settings')
  })

  it('renders queue route when player reports queue capability', () => {
    mockState.hasQueue = true
    const wrapper = mountSidebar()

    const queueLink = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => (link.props('to') as { name?: string })?.name === 'playlist')

    expect(queueLink).toBeTruthy()
    expect(wrapper.text()).toContain('Queue')
  })

  it('regression: omits queue route when queue capability is disabled', () => {
    mockState.hasQueue = false
    const wrapper = mountSidebar()

    const queueLink = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => (link.props('to') as { name?: string })?.name === 'playlist')

    expect(queueLink).toBeUndefined()
    expect(wrapper.text()).not.toContain('Queue')
  })

  it('shows VuMeter only when enabled and running on Pi5+', () => {
    mockState.vuMeterEnabled = true
    mockState.isPi5OrHigher = true

    const wrapper = mountSidebar()
    expect(wrapper.find('.vu-meter-stub').exists()).toBe(true)
  })

  it('hides VuMeter when disabled in settings', () => {
    mockState.vuMeterEnabled = false
    mockState.isPi5OrHigher = true

    const wrapper = mountSidebar()
    expect(wrapper.find('.vu-meter-stub').exists()).toBe(false)
  })

  it('hides VuMeter on unsupported hardware even when setting is enabled', () => {
    mockState.vuMeterEnabled = true
    mockState.isPi5OrHigher = false

    const wrapper = mountSidebar()
    expect(wrapper.find('.vu-meter-stub').exists()).toBe(false)
  })
})
