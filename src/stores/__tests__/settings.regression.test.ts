import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '../settings'

const {
  getConfigKeys,
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
  enableService,
  disableService,
  getSystemInfo,
} = vi.hoisted(() => ({
  getConfigKeys: vi.fn(),
  getConfigValue: vi.fn(),
  setConfigValue: vi.fn(),
  deleteConfigValue: vi.fn(),
  enableService: vi.fn(),
  disableService: vi.fn(),
  getSystemInfo: vi.fn(),
}))

vi.mock('@/api/config', () => ({
  getConfigKeys,
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
  enableService,
  disableService,
}))

vi.mock('@/api/system', () => ({
  getSystemInfo,
}))

describe('Settings Store - Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    getSystemInfo.mockResolvedValue({ pi_model: { version: '5' } })
  })

  it('loads defaults and sets loaded=true', async () => {
    const store = useSettingsStore()

    await store.loadSettings()

    expect(store.loaded).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.getExpertMode).toBe(false)
    expect(store.getVuMeterEnabled).toBe(true)
    expect(store.piVersion).toBe('5')
    expect(store.isPi5OrHigher).toBe(true)
  })

  it('ignores invalid persisted flag types for expertMode and vuMeterEnabled', async () => {
    const store = useSettingsStore()
    localStorage.setItem('ui.expertMode', '"invalid"')
    localStorage.setItem('ui.vuMeterEnabled', '123')

    await store.loadSettings()

    expect(store.getExpertMode).toBe(false)
    expect(store.getVuMeterEnabled).toBe(true)
  })

  it('updateVuMeterEnabled toggles backend service control', async () => {
    const store = useSettingsStore()

    await store.updateVuMeterEnabled(false)
    expect(disableService).toHaveBeenCalledWith('vu-meter')

    await store.updateVuMeterEnabled(true)
    expect(enableService).toHaveBeenCalledWith('vu-meter')
  })

  it('getRoomMeasurements ignores non-string keys and still returns valid parsed entries', async () => {
    const store = useSettingsStore()
    getConfigKeys.mockResolvedValue({
      status: 'success',
      data: ['roomeq.measurement.1', 7],
    })
    getConfigValue.mockResolvedValue({
      status: 'success',
      data: {
        value: JSON.stringify({
          id: 1,
          name: 'M1',
          timestamp: '2026-08-02T00:00:00.000Z',
          frequencies: [10],
          magnitudes: [20],
          sample_rate: 48000,
        }),
      },
    })

    const result = await store.getRoomMeasurements()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('saveRoomMeasurement falls back to id=1 when existing entries have invalid ids', async () => {
    const store = useSettingsStore()
    getConfigKeys.mockResolvedValue({
      status: 'success',
      data: ['roomeq.measurement.9'],
    })
    getConfigValue.mockResolvedValue({
      status: 'success',
      data: {
        value: JSON.stringify({
          name: 'broken',
          timestamp: '2026-08-02T00:00:00.000Z',
          frequencies: [1],
          magnitudes: [1],
          sample_rate: 48000,
        }),
      },
    })

    const id = await store.saveRoomMeasurement('New', [1, 2], [3, 4], 48000)

    expect(id).toBe(1)
    expect(setConfigValue).toHaveBeenCalled()
    const calledKey = (setConfigValue.mock.calls[0] || [])[0]
    expect(calledKey).toBe('roomeq.measurement.1')
  })

  it('deleteRoomMeasurement deletes backend key', async () => {
    const store = useSettingsStore()
    deleteConfigValue.mockResolvedValue(undefined)

    await store.deleteRoomMeasurement(3)

    expect(deleteConfigValue).toHaveBeenCalledWith('roomeq.measurement.3')
  })
})
