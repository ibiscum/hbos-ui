import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getConfigApiBaseUrl: () => 'http://host/api/config/v1',
  }),
}))

vi.mock('@/api/http', () => ({
  apiFetch: vi.fn(),
}))

import {
  getAllConfig,
  getConfigValue,
  saveExternalPlayerSettings,
  scanI2CDevices,
  enableService,
} from '@/api/config'
import { apiFetch } from '@/api/http'

type MockResponse = {
  ok: boolean
  status?: number
  statusText?: string
  json: () => Promise<unknown>
}

const mockApiFetch = vi.mocked(apiFetch)

const okResponse = (body: unknown): MockResponse => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
})

describe('config.ts - unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiFetch.mockResolvedValue(okResponse({ status: 'success', data: {} }) as never)
  })

  describe('unit: URL construction and request methods', () => {
    it('getAllConfig encodes prefix query parameter', async () => {
      await getAllConfig('a/b c')

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1?prefix=a%2Fb%20c')
    })

    it('scanI2CDevices appends bus query parameter', async () => {
      await scanI2CDevices(1)

      expect(mockApiFetch).toHaveBeenCalledWith('http://host/api/config/v1/i2c/devices?bus=1')
    })
  })

  describe('regression: config value retrieval', () => {
    it('keeps empty-string default value in query string', async () => {
      await getConfigValue('service.key', false, '')

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/service.key?default=',
      )
    })

    it('uses secure endpoint when secure=true', async () => {
      await getConfigValue('spotify_secret', true)

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/key/spotify_secret/secure',
      )
    })
  })

  describe('regression: path safety for external player settings', () => {
    it('encodes systemd service name in settings endpoint path', async () => {
      await saveExternalPlayerSettings('pipewire filter/chain', { enabled: true })

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/players/pipewire%20filter%2Fchain/settings',
        expect.objectContaining({ method: 'PUT' }),
      )
    })
  })

  describe('unit: service orchestration', () => {
    it('enableService does not start service when enable fails', async () => {
      mockApiFetch
        .mockResolvedValueOnce(okResponse({ status: 'error', message: 'no permission' }) as never)
        .mockResolvedValueOnce(okResponse({ status: 'success' }) as never)

      const result = await enableService('mpd')

      expect(result).toBe(false)
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/config/v1/systemd/service/mpd/enable',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  describe('regression: scanI2CDevices input contract', () => {
    it('rejects out-of-range bus number values', async () => {
      await expect(scanI2CDevices(-1)).rejects.toThrow('I2C bus number must be an integer between 0 and 10')
      await expect(scanI2CDevices(11)).rejects.toThrow('I2C bus number must be an integer between 0 and 10')
      await expect(scanI2CDevices(1.5)).rejects.toThrow('I2C bus number must be an integer between 0 and 10')
    })
  })
})
