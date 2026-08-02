import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getDSPToolkitApiBaseUrl: () => 'http://host/api/dsptoolkit',
  }),
}))

vi.mock('@/api/http', () => ({
  apiFetch: vi.fn(),
}))

import * as dspApi from '@/api/dsptoolkit'
import { apiFetch } from '@/api/http'

const mockApiFetch = vi.mocked(apiFetch)

const jsonResponse = (body: unknown, status = 200, statusText = 'OK') => ({
  ok: status >= 200 && status < 300,
  status,
  statusText,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => JSON.stringify(body),
})

describe('dsptoolkit.ts - unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('unit: endpoint construction', () => {
    it('builds metadata query with start and filter params', async () => {
      mockApiFetch.mockResolvedValueOnce(jsonResponse({ checksum: 'abc' }) as never)

      await dspApi.getMetadata({ start: 'IIR_', filter: 'biquad' })

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/dsptoolkit/metadata?start=IIR_&filter=biquad',
        expect.any(Object),
      )
    })

    it('builds filters query with checksum and current params', async () => {
      mockApiFetch.mockResolvedValueOnce(jsonResponse({ filters: {} }) as never)

      await dspApi.getStoredFilters({ checksum: 'chk-1', current: true })

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/dsptoolkit/filters?checksum=chk-1&current=true',
        expect.any(Object),
      )
    })
  })

  describe('regression: malformed endpoint and status handling', () => {
    it('deleteStoredFilters without params does not append an empty query marker', async () => {
      mockApiFetch.mockResolvedValueOnce(jsonResponse({ status: 'success', message: 'ok' }) as never)

      await dspApi.deleteStoredFilters({})

      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://host/api/dsptoolkit/filters',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('getDSPProfile throws on non-ok HTTP status', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'down',
      } as never)

      await expect(dspApi.getDSPProfile()).rejects.toThrow(
        'Failed to get DSP profile: 503 Service Unavailable',
      )
    })

    it('getDSPProfile returns body text on success', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'profile-text',
      } as never)

      await expect(dspApi.getDSPProfile()).resolves.toBe('profile-text')
    })
  })

  describe('unit: toolkit status mapping', () => {
    it('maps detected DSP to yes', async () => {
      mockApiFetch.mockResolvedValueOnce(jsonResponse({ detected_dsp: 'adau1452', status: 'detected' }) as never)

      await expect(dspApi.check_dsp_toolkit()).resolves.toBe('yes')
    })

    it('maps non-detected DSP to no', async () => {
      mockApiFetch.mockResolvedValueOnce(jsonResponse({ detected_dsp: '', status: 'not_detected' }) as never)

      await expect(dspApi.check_dsp_toolkit()).resolves.toBe('no')
    })

    it('maps backend failures to backend_error', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('HTTP 503: Service Unavailable'))

      await expect(dspApi.check_dsp_toolkit()).resolves.toBe('backend_error')
    })
  })
})
