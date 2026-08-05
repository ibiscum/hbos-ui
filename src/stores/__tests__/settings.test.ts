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
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

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

  it('loads persisted settings when values are valid', async () => {
    const store = useSettingsStore()
    localStorage.setItem('ui.service.settings', JSON.stringify({
      lastfm: { scrobble: false, manageFavourites: true },
      spotify: { controlPlayer: true, manageFavourites: false },
    }))
    localStorage.setItem('ui.expertMode', 'true')
    localStorage.setItem('ui.vuMeterEnabled', 'false')

    await store.loadSettings()

    expect(store.getLastfmSettings.scrobble).toBe(false)
    expect(store.getLastfmSettings.manageFavourites).toBe(true)
    expect(store.getSpotifySettings.controlPlayer).toBe(true)
    expect(store.getSpotifySettings.manageFavourites).toBe(false)
    expect(store.getExpertMode).toBe(true)
    expect(store.getVuMeterEnabled).toBe(false)
  })

  it('ignores invalid persisted flag types for expertMode and vuMeterEnabled', async () => {
    const store = useSettingsStore()
    localStorage.setItem('ui.expertMode', '"invalid"')
    localStorage.setItem('ui.vuMeterEnabled', '123')

    await store.loadSettings()

    expect(store.getExpertMode).toBe(false)
    expect(store.getVuMeterEnabled).toBe(true)
  })

  it('handles Pi version fetch failure by using unknown', async () => {
    const store = useSettingsStore()
    getSystemInfo.mockRejectedValueOnce(new Error('offline'))

    await store.loadSettings()

    expect(store.piVersion).toBe('unknown')
    expect(store.isPi5OrHigher).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch Pi version:', expect.any(Error))
  })

  it('keeps app defaults and sets loaded=true when persisted settings are malformed', async () => {
    const store = useSettingsStore()
    localStorage.setItem('ui.service.settings', '{bad-json')

    await store.loadSettings()

    expect(store.loaded).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.getExpertMode).toBe(false)
    expect(store.getVuMeterEnabled).toBe(true)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load settings:', expect.any(Error))
  })

  it('updateServiceSettings helpers persist and merge settings', async () => {
    const store = useSettingsStore()

    await store.updateLastfmSettings({ scrobble: false })
    await store.updateSpotifySettings({ controlPlayer: false })

    expect(store.getLastfmSettings.scrobble).toBe(false)
    expect(store.getLastfmSettings.manageFavourites).toBe(true)
    expect(store.getSpotifySettings.controlPlayer).toBe(false)
    expect(store.getSpotifySettings.manageFavourites).toBe(true)
    expect(localStorage.getItem('ui.service.settings')).toContain('"scrobble":false')
  })

  it('updateExpertMode persists value through saveSettings', async () => {
    const store = useSettingsStore()

    await store.updateExpertMode(true)

    expect(store.getExpertMode).toBe(true)
    expect(localStorage.getItem('ui.expertMode')).toBe('true')
  })

  it('saveSettings resets loading state and rethrows storage errors', async () => {
    const store = useSettingsStore()
    const stringifySpy = vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('disk full')
    })

    await expect(store.saveSettings()).rejects.toThrow('disk full')
    expect(store.loading).toBe(false)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error))

    stringifySpy.mockRestore()
  })

  it('updateVuMeterEnabled toggles backend service control', async () => {
    const store = useSettingsStore()

    await store.updateVuMeterEnabled(false)
    expect(disableService).toHaveBeenCalledWith('vu-meter')

    await store.updateVuMeterEnabled(true)
    expect(enableService).toHaveBeenCalledWith('vu-meter')
  })

  it('updateVuMeterEnabled swallows service-control errors after persisting UI state', async () => {
    const store = useSettingsStore()
    disableService.mockRejectedValueOnce(new Error('service unavailable'))

    await expect(store.updateVuMeterEnabled(false)).resolves.toBeUndefined()

    expect(store.getVuMeterEnabled).toBe(false)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to control vu-meter service:',
      expect.any(Error),
    )
  })

  it('resets settings back to defaults', async () => {
    const store = useSettingsStore()

    await store.updateExpertMode(true)
    await store.updateLastfmSettings({ scrobble: false })
    await store.updateSpotifySettings({ controlPlayer: false })
    await store.updateVuMeterEnabled(false)

    await store.resetSettings()

    expect(store.getExpertMode).toBe(false)
    expect(store.getVuMeterEnabled).toBe(true)
    expect(store.getLastfmSettings.scrobble).toBe(true)
    expect(store.getSpotifySettings.controlPlayer).toBe(true)
  })

  it('returns service settings getter by key', () => {
    const store = useSettingsStore()

    expect(store.getServiceSettings('lastfm').value.scrobble).toBe(true)
    expect(store.getServiceSettings('spotify').value.controlPlayer).toBe(true)
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

  it('getRoomMeasurements sorts results by id and ignores invalid records', async () => {
    const store = useSettingsStore()
    getConfigKeys.mockResolvedValueOnce({
      status: 'success',
      data: ['roomeq.measurement.9', 'roomeq.measurement.2', 'roomeq.measurement.6'],
    })

    getConfigValue
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          value: JSON.stringify({
            id: 9,
            name: 'M9',
            timestamp: '2026-08-02T00:00:00.000Z',
            frequencies: [1],
            magnitudes: [1],
            sample_rate: 48000,
          }),
        },
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          value: JSON.stringify({
            id: 2,
            name: 'M2',
            timestamp: '2026-08-02T00:00:00.000Z',
            frequencies: [1],
            magnitudes: [1],
            sample_rate: 48000,
          }),
        },
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          value: JSON.stringify({
            id: 0,
            name: 'invalid',
            timestamp: '2026-08-02T00:00:00.000Z',
            frequencies: [1],
            magnitudes: [1],
            sample_rate: 48000,
          }),
        },
      })

    const result = await store.getRoomMeasurements()

    expect(result.map((m) => m.id)).toEqual([2, 9])
  })

  it('continues when one measurement payload cannot be parsed', async () => {
    const store = useSettingsStore()
    getConfigKeys.mockResolvedValueOnce({
      status: 'success',
      data: ['roomeq.measurement.1', 'roomeq.measurement.2'],
    })
    getConfigValue
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          value: '{broken-json',
        },
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          value: JSON.stringify({
            id: 2,
            name: 'M2',
            timestamp: '2026-08-02T00:00:00.000Z',
            frequencies: [10],
            magnitudes: [20],
            sample_rate: 48000,
          }),
        },
      })

    const result = await store.getRoomMeasurements()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to parse measurement roomeq.measurement.1:',
      expect.any(Error),
    )
  })

  it('returns empty list when getConfigKeys reports not found', async () => {
    const store = useSettingsStore()
    getConfigKeys.mockRejectedValueOnce(new Error('404 Not Found'))

    const result = await store.getRoomMeasurements()

    expect(result).toEqual([])
  })

  it('returns empty list and logs for non-404 room-measurement fetch errors', async () => {
    const store = useSettingsStore()
    getConfigKeys.mockRejectedValueOnce(new Error('500 Backend Error'))

    const result = await store.getRoomMeasurements()

    expect(result).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load room measurements from backend:',
      expect.any(Error),
    )
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

  it('saveRoomMeasurement uses next valid id and preserves metadata', async () => {
    const store = useSettingsStore()
    getConfigKeys.mockResolvedValueOnce({
      status: 'success',
      data: ['roomeq.measurement.2', 'roomeq.measurement.4'],
    })
    getConfigValue
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          value: JSON.stringify({
            id: 2,
            name: 'M2',
            timestamp: '2026-08-02T00:00:00.000Z',
            frequencies: [1],
            magnitudes: [1],
            sample_rate: 48000,
          }),
        },
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          value: JSON.stringify({
            id: 4,
            name: 'M4',
            timestamp: '2026-08-02T00:00:00.000Z',
            frequencies: [1],
            magnitudes: [1],
            sample_rate: 48000,
          }),
        },
      })

    const id = await store.saveRoomMeasurement('New', [1, 2], [3, 4], 48000, {
      frequency_type: 'log_summary',
      points_per_octave: 24,
      frequency_range: [20, 20000],
    })

    expect(id).toBe(5)
    expect(setConfigValue).toHaveBeenCalledWith(
      'roomeq.measurement.5',
      expect.stringContaining('"frequency_type":"log_summary"'),
    )
  })

  it('saveRoomMeasurement rethrows backend write errors', async () => {
    const store = useSettingsStore()
    setConfigValue.mockRejectedValueOnce(new Error('write failed'))

    await expect(store.saveRoomMeasurement('New', [1], [2], 48000)).rejects.toThrow('write failed')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save room measurement:', expect.any(Error))
  })

  it('deleteRoomMeasurement deletes backend key', async () => {
    const store = useSettingsStore()
    deleteConfigValue.mockResolvedValue(undefined)

    await store.deleteRoomMeasurement(3)

    expect(deleteConfigValue).toHaveBeenCalledWith('roomeq.measurement.3')
  })

  it('deleteRoomMeasurement rethrows backend errors', async () => {
    const store = useSettingsStore()
    deleteConfigValue.mockRejectedValueOnce(new Error('delete failed'))

    await expect(store.deleteRoomMeasurement(3)).rejects.toThrow('delete failed')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to delete room measurement from backend:',
      expect.any(Error),
    )
  })

  it('exposes store internals expected by consumers', () => {
    const store = useSettingsStore()

    expect(store.settings).toBeDefined()
    expect(store.getLastfmSettings).toBeDefined()
    expect(store.getSpotifySettings).toBeDefined()
    expect(store.getExpertMode).toBeDefined()
    expect(store.getVuMeterEnabled).toBeDefined()
    expect(store.isPi5OrHigher).toBe(false)
    expect(consoleLogSpy).not.toHaveBeenCalledWith('unexpected sentinel')
  })
})
