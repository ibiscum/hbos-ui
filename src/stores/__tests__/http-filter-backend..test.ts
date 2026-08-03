import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}))

vi.mock('@/api/http', () => ({
  apiFetch: mockApiFetch,
}))

import { HttpFilterBackend } from '@/stores/http_filter_backend'

describe('http filter backend - regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ id: 'f-1' }),
    })
  })

  it('encodes bank names in addFilter endpoint path', async () => {
    const backend = new HttpFilterBackend('/api')

    await backend.addFilter('C 1/Left', 0, {
      type: 'highpass',
      frequency: 80,
      q: 0.7,
      enabled: true,
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/filter-banks/C%201%2FLeft/filters',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('encodes bank names in update/remove/create endpoints', async () => {
    const backend = new HttpFilterBackend('/api')

    await backend.updateFilter('A/B Name', 1, { frequency: 1000 })
    await backend.removeFilter('A/B Name', 1)
    await backend.createFilterBank('A/B Name')

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/filter-banks/A%2FB%20Name/filters/1',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/filter-banks/A%2FB%20Name/filters/1',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/filter-banks/A%2FB%20Name',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('provides backendShortDescription fallback when capabilities payload omits it', async () => {
    const backend = new HttpFilterBackend('/api')
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({
        availableFilterBanks: [],
        backendName: 'Remote DSP',
        backendDescription: 'Remote endpoint',
      }),
    })

    const capabilities = await backend.getBackendCapabilities()

    expect(capabilities.backendShortDescription).toBe(backend.name)
  })
})
