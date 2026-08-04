import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import SystemInfoView from '../system-info.vue'

const baseSystemInfo = {
  status: 'success' as const,
  pi_model: {
    name: 'Raspberry Pi 5',
    version: '5',
    memory: {
      total_kb: 4194304,
      total_mb: 4096,
      total_gb: 4,
    },
  },
  hat_info: {
    vendor: 'HiFiBerry',
    product: 'DAC+ DSP',
    uuid: 'hat-uuid-1',
    vendor_card: 'hifiberry',
  },
  soundcard: {
    name: 'Beocreate 4-Channel Amplifier',
    volume_control: 'Digital',
    headphone_volume_control: null,
    hardware_index: 0,
    output_channels: 2,
    input_channels: 2,
    features: ['DSP'],
    hat_name: 'DAC+ DSP',
    supports_dsp: true,
    card_type: ['dac'],
    pinSource: 'configdb',
  },
  system: {
    uuid: 'sys-uuid-1',
    hostname: 'hbos',
    pretty_hostname: 'Living Room',
  },
}

const mocks = vi.hoisted(() => {
  const getSystemInfo = vi.fn()
  const updateHostname = vi.fn()
  const getSoundCards = vi.fn()
  const rebootSystem = vi.fn()
  const getCacheStats = vi.fn()
  const getBackgroundJobs = vi.fn()
  const checkFileExistence = vi.fn()

  const getNetworkConfiguration = vi.fn()
  const scanI2CDevices = vi.fn()

  const getInputs = vi.fn()
  const getVolumeInfo = vi.fn()
  const getDSPProgramInfo = vi.fn()

  const getCoverArtMethods = vi.fn()
  const getAllLibraryStats = vi.fn()

  const getFavouritesInfo = vi.fn(async () => undefined)
  const getProviderStatusText = vi.fn(() => 'active')
  const getProviderStatusClass = vi.fn(() => 'status-active')

  const appConfigStore = {
    getApiBaseUrl: vi.fn(() => 'http://localhost/api/audiocontrol'),
    getConfigApiBaseUrl: vi.fn(() => 'http://localhost/api/configuration'),
    getDSPToolkitApiBaseUrl: vi.fn(() => 'http://localhost/api/dsptoolkit'),
    getRoomEQApiBaseUrl: vi.fn(() => 'http://localhost/api/roomeq'),
  }

  const settingsStore = {
    isPi5OrHigher: true,
  }

  return {
    getSystemInfo,
    updateHostname,
    getSoundCards,
    rebootSystem,
    getCacheStats,
    getBackgroundJobs,
    checkFileExistence,
    getNetworkConfiguration,
    scanI2CDevices,
    getInputs,
    getVolumeInfo,
    getDSPProgramInfo,
    getCoverArtMethods,
    getAllLibraryStats,
    getFavouritesInfo,
    getProviderStatusText,
    getProviderStatusClass,
    appConfigStore,
    settingsStore,
    favouritesRefs: null as null | {
      loading: { value: boolean }
      error: { value: string }
      info: { value: { providers: Array<{ name: string; display_name: string; favourite_count: number | null }> } | null }
    },
  }
})

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    template: '<section class="page-content-stub"><slot /></section>',
  },
}))

vi.mock('@/components/BackRouter.vue', () => ({
  default: {
    name: 'BackRouter',
    props: ['to'],
    template: '<a class="back-router-stub" :data-to="to?.name"><slot /></a>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/api/system', () => ({
  getSystemInfo: mocks.getSystemInfo,
  updateHostname: mocks.updateHostname,
  getSoundCards: mocks.getSoundCards,
  rebootSystem: mocks.rebootSystem,
  getCacheStats: mocks.getCacheStats,
  getBackgroundJobs: mocks.getBackgroundJobs,
  checkFileExistence: mocks.checkFileExistence,
}))

vi.mock('@/api/config', () => ({
  getNetworkConfiguration: mocks.getNetworkConfiguration,
  scanI2CDevices: mocks.scanI2CDevices,
}))

vi.mock('@/api/inputs', () => ({
  getInputs: mocks.getInputs,
}))

vi.mock('@/api/volume', () => ({
  getVolumeInfo: mocks.getVolumeInfo,
}))

vi.mock('@/api/dsptoolkit', () => ({
  getDSPProgramInfo: mocks.getDSPProgramInfo,
}))

vi.mock('@/api/coverart', () => ({
  getCoverArtMethods: mocks.getCoverArtMethods,
}))

vi.mock('@/api/audiocontrol-library', () => ({
  getAllLibraryStats: mocks.getAllLibraryStats,
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => mocks.appConfigStore,
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => mocks.settingsStore,
}))

vi.mock('@/composables/useEditableField', async () => {
  const { ref } = await import('vue')

  return {
    useEditableText: (currentValue: { value?: string | null }, onSave: (value: string) => Promise<{ status: string }>) => {
      const isEditing = ref(false)
      const editValue = ref('')
      const isSaving = ref(false)

      const startEditing = () => {
        editValue.value = currentValue?.value || ''
        isEditing.value = true
      }

      const cancelEditing = () => {
        isEditing.value = false
      }

      const saveEdit = async () => {
        isSaving.value = true
        try {
          const result = await onSave(editValue.value)
          if (result.status === 'success') {
            isEditing.value = false
          }
          return result
        } finally {
          isSaving.value = false
        }
      }

      return {
        isEditing,
        editValue,
        isSaving,
        startEditing,
        cancelEditing,
        saveEdit,
      }
    },
  }
})

vi.mock('@/composables/useFavouritesInfo', async () => {
  const { ref } = await import('vue')

  const loading = ref(false)
  const error = ref('')
  const info = ref({
    providers: [
      {
        name: 'local',
        display_name: 'Local',
        favourite_count: 3,
      },
    ],
  })

  ;(mocks as { favouritesRefs: unknown }).favouritesRefs = {
    loading,
    error,
    info,
  }

  return {
    useFavouritesInfo: () => ({
      loading,
      error,
      favouritesInfo: info,
      getFavouritesInfo: mocks.getFavouritesInfo,
      getProviderStatusText: mocks.getProviderStatusText,
      getProviderStatusClass: mocks.getProviderStatusClass,
    }),
  }
})

const mountView = () =>
  mount(SystemInfoView, {
    global: {
      stubs: {
        RouterLink: {
          template: '<a class="router-link-stub"><slot /></a>',
        },
      },
    },
  })

const mockBackgroundFetchOk = () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ version: '1.0.0' }),
  }))

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('services/system-info view consolidated unit and regression tests', () => {
  beforeAll(() => {
    mockBackgroundFetchOk()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockBackgroundFetchOk()

    mocks.settingsStore.isPi5OrHigher = true

    mocks.getSystemInfo.mockResolvedValue({ ...baseSystemInfo })
    mocks.updateHostname.mockResolvedValue({ status: 'success' })
    mocks.getSoundCards.mockResolvedValue({ status: 'success', data: { soundcards: [], count: 0 } })
    mocks.rebootSystem.mockResolvedValue({ status: 'success' })

    mocks.getCacheStats.mockResolvedValue({
      success: true,
      message: null,
      stats: {
        disk_entries: 10,
        memory_entries: 3,
        memory_bytes: 1024,
        memory_limit_bytes: 2048,
      },
      image_cache_stats: {
        total_images: 7,
        total_size: 4096,
        last_updated: Math.floor(Date.now() / 1000) - 60,
      },
    })

    mocks.getBackgroundJobs.mockResolvedValue({
      success: true,
      message: null,
      jobs: [],
    })

    mocks.checkFileExistence.mockResolvedValue([
      { path: '/etc/uuid', filename: 'uuid', exists: true },
      { path: '/etc/hifiberry.user', filename: 'hifiberry.user', exists: false },
    ])

    mocks.getNetworkConfiguration.mockResolvedValue({
      status: 'success',
      data: {
        hostname: 'hbos',
        default_gateway: '192.168.1.1',
        dns_servers: ['1.1.1.1', '8.8.8.8'],
        interfaces: [
          {
            name: 'eth0',
            mac: '00:11:22:33:44:55',
            ipv4: '192.168.1.2',
            netmask: '255.255.255.0',
            state: 'up',
            type: 'wired',
          },
        ],
      },
    })

    mocks.scanI2CDevices.mockResolvedValue({
      status: 'success',
      data: {
        bus_number: 1,
        bus_path: '/dev/i2c-1',
        bus_exists: true,
        smbus2_available: true,
        detected_devices: ['0x4c'],
        kernel_used: ['0x3b'],
        scan_range: '0x03-0x77',
      },
    })

    mocks.getInputs.mockResolvedValue({
      inputs: [
        {
          name: 'keyboard',
          status: {
            enabled: true,
            volume_step: 5,
            grab: false,
            device_filter: '',
            mapped_keys: 4,
            devices: [
              {
                path: '/dev/input/event0',
                name: 'Keyboard',
                matched_keys: ['KEY_VOLUMEUP', 'KEY_VOLUMEDOWN'],
              },
            ],
            unbound_devices: [],
            last_key: null,
          },
        },
      ],
    })

    mocks.getVolumeInfo.mockResolvedValue({
      available: true,
      supports_change_monitoring: true,
      control_info: {
        display_name: 'Main',
        decibel_range: {
          min_db: -60,
          max_db: 0,
        },
      },
      current_state: {
        percentage: 42.4,
        decibels: -12,
      },
    })

    mocks.getDSPProgramInfo.mockResolvedValue({
      program_length: 0,
      checksums: {},
    })

    mocks.getCoverArtMethods.mockResolvedValue({
      methods: [
        { method: 'File', providers: [{ display_name: 'Embedded' }] },
        { method: 'Url', providers: [{ display_name: 'URL' }] },
      ],
    })

    mocks.getAllLibraryStats.mockResolvedValue([
      {
        player_name: 'Local music',
        player_id: 'mpd',
        has_library: true,
        is_loaded: true,
        artists_count: 120,
        albums_count: 300,
        tracks_count: 4200,
      },
    ])

    if (mocks.favouritesRefs) {
      mocks.favouritesRefs.loading.value = false
      mocks.favouritesRefs.error.value = ''
      mocks.favouritesRefs.info.value = {
        providers: [{ name: 'local', display_name: 'Local', favourite_count: 3 }],
      }
    }
  })

  describe('unit coverage', () => {
    it('renders page shell, back route, and core cards after load', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.page-content-stub').exists()).toBe(true)
      expect(wrapper.get('.back-router-stub').attributes('data-to')).toBe('services')
      expect(wrapper.text()).toContain('System Information')
      expect(wrapper.text()).toContain('Raspberry Pi')
      expect(wrapper.text()).toContain('Sound Card')
      expect(wrapper.text()).toContain('Click to enable auto-update')

      wrapper.unmount()
    })

    it('shows transformed sound card name and active pin source label link', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Beocreate')
      expect(wrapper.text()).toContain('ConfigDB')
      expect(wrapper.find('.router-link-stub').exists()).toBe(true)

      wrapper.unmount()
    })

    it('renders informational notice when input status endpoint is unavailable', async () => {
      mocks.getInputs.mockResolvedValueOnce(null)

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Input device status unavailable (requires audiocontrol 0.8.0 or newer)')
      expect(wrapper.text()).not.toContain('Failed to load input devices')

      wrapper.unmount()
    })

    it('shows retry state and reloads system info after initial fetch failure', async () => {
      mocks.getSystemInfo
        .mockRejectedValueOnce(new Error('system endpoint unavailable'))
        .mockResolvedValueOnce({ ...baseSystemInfo })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('system endpoint unavailable')

      await wrapper.get('.retry-button').trigger('click')
      await flushPromises()

      expect(mocks.getSystemInfo).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('Raspberry Pi')

      wrapper.unmount()
    })
  })

  describe('regression coverage', () => {
    it('maps DSP connectivity errors to no-hardware message', async () => {
      mocks.getDSPProgramInfo.mockRejectedValueOnce(new Error('502 Bad Gateway'))

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('No DSP hardware detected')

      wrapper.unmount()
    })

    it('pauses and resumes auto-update around hostname editing actions', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.hostname-display .edit-button').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Auto-update paused')

      await wrapper.get('.hostname-edit .cancel-button').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Click to enable auto-update')

      wrapper.unmount()
    })

    it('keeps background jobs sorted newest first by latest update timestamp', async () => {
      mocks.getBackgroundJobs.mockResolvedValueOnce({
        success: true,
        message: null,
        jobs: [
          {
            id: 'older',
            name: 'Older Job',
            start_time: 1000,
            last_update: 1100,
            finish_time: null,
            status: 'running',
            progress: null,
            total_items: null,
            completed_items: null,
            duration_seconds: 100,
            time_since_last_update: 10,
            completion_percentage: null,
          },
          {
            id: 'newer',
            name: 'Newer Job',
            start_time: 2000,
            last_update: 2100,
            finish_time: null,
            status: 'running',
            progress: null,
            total_items: null,
            completed_items: null,
            duration_seconds: 50,
            time_since_last_update: 5,
            completion_percentage: null,
          },
        ],
      })

      const wrapper = mountView()
      await flushPromises()

      const jobsCard = wrapper
        .findAll('.info-card')
        .find((card) => card.find('h2').text() === 'Background Jobs')

      expect(jobsCard).toBeTruthy()

      const labels = jobsCard!
        .findAll('tbody tr td.label')
        .map((node) => node.text())

      expect(labels[0]).toBe('Newer Job')
      expect(labels[1]).toBe('Older Job')

      wrapper.unmount()
    })

    it('auto-update refreshes library statistics on scheduled refresh cycles', async () => {
      vi.useFakeTimers()

      const wrapper = mountView()
      await flushPromises()

      expect(mocks.getAllLibraryStats).toHaveBeenCalledTimes(1)

      await wrapper.get('.auto-update-indicator').trigger('click')
      await vi.advanceTimersByTimeAsync(60000)
      await flushPromises()

      expect(mocks.getAllLibraryStats).toHaveBeenCalledTimes(2)

      wrapper.unmount()
      vi.useRealTimers()
    })
  })
})
