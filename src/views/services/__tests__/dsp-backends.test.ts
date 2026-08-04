import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import DspBackendsView from '../dsp-backends.vue'

const mocks = vi.hoisted(() => {
  const capabilitiesByBackend = {
    console: {
      backendName: 'Demo',
      backendShortDescription: 'Demo backend',
      backendDescription: '<p>Demo backend details</p>',
      availableFilterBanks: [
        { name: 'left', maxFilters: 10, currentFilterCount: 2 },
        { name: 'right', maxFilters: 10, currentFilterCount: 2 },
      ],
    },
    dspToolkit: {
      backendName: 'HiFiBerry DSP',
      backendShortDescription: 'Hardware DSP backend',
      backendDescription: '<p>DSP backend details</p>',
      availableFilterBanks: [
        { name: 'left', maxFilters: 20, currentFilterCount: 4 },
        { name: 'right', maxFilters: 20, currentFilterCount: 4 },
      ],
    },
  }

  const filterStore = {
    currentBackendType: 'console' as 'console' | 'dspToolkit',
    initializeBackend: vi.fn(),
    switchBackend: vi.fn(),
    getBackendCapabilities: vi.fn(),
  }

  const dspToolkitStore = {
    status: 'yes' as 'yes' | 'no' | 'backend_error',
    checkDSPStatus: vi.fn(),
    canUseDSP: vi.fn(),
  }

  const toastStore = {
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
    showInfoToast: vi.fn(),
  }

  return {
    capabilitiesByBackend,
    filterStore,
    dspToolkitStore,
    toastStore,
  }
})

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template: '<section class="page-content-stub" :data-title="title"><slot /></section>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<span class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/stores/filter-connector', () => ({
  useFilterStore: () => mocks.filterStore,
}))

vi.mock('@/stores/dsp-toolkit', () => ({
  useDSPToolkitStore: () => mocks.dspToolkitStore,
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => mocks.toastStore,
}))

vi.mock('@/helpers/dspFilterBankTranslations', () => ({
  getFilterBankDisplayName: (name: string) => name.toUpperCase(),
}))

const mountView = () =>
  mount(DspBackendsView, {
    global: {
      stubs: {
        teleport: true,
      },
    },
  })

describe('services/dsp-backends view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.filterStore.currentBackendType = 'console'
    mocks.filterStore.initializeBackend.mockResolvedValue(undefined)
    mocks.filterStore.switchBackend.mockImplementation(async (backend: 'console' | 'dspToolkit') => {
      mocks.filterStore.currentBackendType = backend
    })
    mocks.filterStore.getBackendCapabilities.mockImplementation(async () => {
      return mocks.capabilitiesByBackend[mocks.filterStore.currentBackendType]
    })

    mocks.dspToolkitStore.status = 'yes'
    mocks.dspToolkitStore.checkDSPStatus.mockImplementation(async () => mocks.dspToolkitStore.status)
    mocks.dspToolkitStore.canUseDSP.mockResolvedValue(true)
  })

  describe('unit coverage', () => {
    it('renders page shell, semantic header, and backend cards', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('.page-content-stub').attributes('data-title')).toBe('DSP Backends')
      expect(wrapper.get('.dsp-backends-header h2').text()).toBe('Backend Selection')
      expect(wrapper.text()).toContain('Demo')
      expect(wrapper.text()).toContain('HiFiBerry DSP')
    })

    it('loads backend info on mount and marks current backend as active', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(mocks.filterStore.initializeBackend).toHaveBeenCalledTimes(1)
      expect(mocks.dspToolkitStore.checkDSPStatus).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toContain('Active')
      expect(wrapper.text()).toContain('LEFT')
      expect(wrapper.text()).toContain('10 filters')
    })

    it('shows unavailable state for DSP backend when hardware is missing', async () => {
      mocks.dspToolkitStore.status = 'no'
      mocks.dspToolkitStore.canUseDSP.mockResolvedValue(false)

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('No DSP hardware detected')
      expect(wrapper.text()).toContain('Unavailable')
    })

    it('opens backend details modal from info action', async () => {
      const wrapper = mountView()
      await flushPromises()

      const infoButtons = wrapper.findAll('.info-btn')
      await infoButtons[0].trigger('click')
      await flushPromises()

      expect(wrapper.find('.backend-info-modal').exists()).toBe(true)
      expect(wrapper.text()).toContain('Demo Information')
      expect(wrapper.html()).toContain('Demo backend details')
    })
  })

  describe('regression coverage', () => {
    it('switches to selected backend and updates active state', async () => {
      const wrapper = mountView()
      await flushPromises()

      const backendItems = wrapper.findAll('.backend-item')
      await backendItems[1].trigger('click')
      await flushPromises()

      expect(mocks.filterStore.switchBackend).toHaveBeenCalledWith('dspToolkit')
      expect(wrapper.text()).toContain('Hardware DSP backend')
    })

    it('blocks switching to DSP backend when unavailable and shows toast', async () => {
      mocks.dspToolkitStore.status = 'backend_error'
      mocks.dspToolkitStore.canUseDSP.mockResolvedValue(false)

      const wrapper = mountView()
      await flushPromises()

      const backendItems = wrapper.findAll('.backend-item')
      await backendItems[1].trigger('click')
      await flushPromises()

      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith(
        'Cannot switch to DSP Toolkit: HiFiBerry DSP software not available',
      )
      expect(mocks.filterStore.switchBackend).not.toHaveBeenCalledWith('dspToolkit')
    })

    it('falls back to demo backend when current DSP backend is unavailable', async () => {
      mocks.filterStore.currentBackendType = 'dspToolkit'
      mocks.dspToolkitStore.status = 'no'
      mocks.dspToolkitStore.canUseDSP.mockResolvedValue(false)

      mountView()
      await flushPromises()

      expect(mocks.filterStore.switchBackend).toHaveBeenCalledWith('console')
    })

    it('shows initialization toast when backend initialization fails', async () => {
      mocks.filterStore.initializeBackend.mockRejectedValueOnce(new Error('init failed'))

      mountView()
      await flushPromises()

      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('Failed to initialize DSP backends')
    })
  })
})
