import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getDetectedDSP,
  getMetadata,
  readMemory,
  writeMemory,
  setBiquadFilter,
  readRegister,
  writeRegister,
  calculateFrequencyResponse,
  getCacheStatus,
  clearCache,
  getDSPProfile,
  updateDSPProfile,
  getDSPProfilesMetadata,
  getDSPProgramChecksum,
  getDSPProgramInfo,
  getStoredFilters,
  storeFilters,
  deleteStoredFilters,
  setFilterBypassState,
  setFilterBankBypassState,
  setIndividualFilterBypassState,
  readChannelDelay,
  writeChannelDelay,
  readChannelLevel,
  writeChannelLevel,
  readChannelInvert,
  writeChannelInvert,
  readChannelSelect,
  writeChannelSelect,
  check_dsp_toolkit,
  type DetectedDSP,
  type DSPMetadata,
  type MemoryReadResponse,
  type MemoryWriteResponse,
  type BiquadResponse,
  type FilterBypassSetResponse,
  type DSPToolkitStatus
} from '@/api/dsptoolkit'
import * as httpApi from '@/api/http'
import { useAppConfigStore } from '@/stores/appconfig'

// Mock dependencies
vi.mock('@/api/http', () => ({
  apiFetch: vi.fn()
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: vi.fn(() => ({
    getDSPToolkitApiBaseUrl: vi.fn(() => 'http://localhost:8080/api/dsptoolkit')
  }))
}))

describe('DSP Toolkit API', () => {
  let mockApiFetch: typeof httpApi.apiFetch
  let mockConfigStore: ReturnType<typeof useAppConfigStore>

  beforeEach(() => {
    mockApiFetch = httpApi.apiFetch as typeof httpApi.apiFetch
    mockConfigStore = useAppConfigStore()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Hardware Detection', () => {
    describe('getDetectedDSP', () => {
      it('should return detected DSP status', async () => {
        const mockResponse: DetectedDSP = {
          detected_dsp: 'ADAU1701',
          status: 'detected'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getDetectedDSP()

        expect(result.detected_dsp).toBe('ADAU1701')
        expect(result.status).toBe('detected')
        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/dsptoolkit/hardware/dsp',
          expect.objectContaining({
            signal: expect.any(AbortSignal),
            headers: expect.objectContaining({ 'Content-Type': 'application/json' })
          })
        )
      })

      it('should return not_detected status', async () => {
        const mockResponse: DetectedDSP = {
          detected_dsp: '',
          status: 'not_detected'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getDetectedDSP()

        expect(result.status).toBe('not_detected')
      })

      it('should throw error on HTTP failure', async () => {
        const mockFetchResponse = new Response('Not Found', {
          status: 404,
          statusText: 'Not Found'
        })
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getDetectedDSP()).rejects.toThrow('HTTP 404: Not Found')
      })

      it('should throw error on timeout', async () => {
        vi.mocked(mockApiFetch).mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new Error()
            error.name = 'AbortError'
            reject(error)
          })
        })

        await expect(getDetectedDSP()).rejects.toThrow('Request timeout')
      })

      it('should throw error on HTML response', async () => {
        const mockFetchResponse = new Response('<!DOCTYPE html><html></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        })
        mockFetchResponse.ok = true
        mockFetchResponse.text = vi.fn().mockResolvedValue('<!DOCTYPE html><html></html>')
        mockFetchResponse.json = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <'))

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getDetectedDSP()).rejects.toThrow('HiFiBerry DSP software not available')
      })
    })
  })

  describe('Metadata', () => {
    describe('getMetadata', () => {
      it('should fetch metadata without parameters', async () => {
        const mockResponse: DSPMetadata = {
          checksum: 'abc123',
          _system: {
            profileName: 'Default',
            profileVersion: '1.0',
            sampleRate: 44100
          }
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getMetadata()

        expect(result.checksum).toBe('abc123')
        expect(mockApiFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/dsptoolkit/metadata',
          expect.any(Object)
        )
      })

      it('should fetch metadata with parameters', async () => {
        const mockResponse: DSPMetadata = {
          checksum: 'abc123'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await getMetadata({ start: '0x1000', filter: 'biquad' })

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('start=0x1000'),
          expect.any(Object)
        )
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('filter=biquad'),
          expect.any(Object)
        )
      })
    })
  })

  describe('Memory Access', () => {
    describe('readMemory', () => {
      it('should read memory from address', async () => {
        const mockResponse: MemoryReadResponse = {
          address: '0x1000',
          values: ['0xDEADBEEF', '0xCAFEBABE']
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await readMemory('0x1000')

        expect(result.address).toBe('0x1000')
        expect(result.values).toHaveLength(2)
      })

      it('should read memory with length parameter', async () => {
        const mockResponse: MemoryReadResponse = {
          address: '0x1000',
          values: [1, 2, 3, 4]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await readMemory('0x1000', 4)

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/memory/0x1000/4'),
          expect.any(Object)
        )
      })

      it('should read memory with format parameter', async () => {
        const mockResponse: MemoryReadResponse = {
          address: '0x1000',
          values: [1.5, 2.5]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await readMemory('0x1000', undefined, 'float')

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('format=float'),
          expect.any(Object)
        )
      })
    })

    describe('writeMemory', () => {
      it('should write memory successfully', async () => {
        const mockResponse: MemoryWriteResponse = {
          address: '0x1000',
          values: [42],
          status: 'success'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await writeMemory({
          address: '0x1000',
          value: 42
        })

        expect(result.status).toBe('success')
        expect(result.address).toBe('0x1000')
      })

      it('should write memory with array values', async () => {
        const mockResponse: MemoryWriteResponse = {
          address: '0x1000',
          values: [1, 2, 3],
          status: 'success'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await writeMemory({
          address: '0x1000',
          value: [1, 2, 3]
        })

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/memory'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      it('should write memory with store flag', async () => {
        const mockResponse: MemoryWriteResponse = {
          address: '0x1000',
          values: [42],
          status: 'success',
          stored: true
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await writeMemory({
          address: '0x1000',
          value: 42,
          store: true
        })

        expect(result.stored).toBe(true)
      })
    })
  })

  describe('Biquad Filter', () => {
    describe('setBiquadFilter', () => {
      it('should set biquad filter with PeakingEq', async () => {
        const mockResponse: BiquadResponse = {
          status: 'success',
          address: '0x2000',
          sampleRate: 48000,
          filter: {
            type: 'PeakingEq',
            f: 1000,
            db: 6,
            q: 0.707
          },
          coefficients: {
            a0: 1,
            a1: -1.5,
            a2: 0.5,
            b0: 1.2,
            b1: -1.4,
            b2: 0.6
          }
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await setBiquadFilter({
          address: '0x2000',
          sampleRate: 48000,
          filter: {
            type: 'PeakingEq',
            f: 1000,
            db: 6,
            q: 0.707
          }
        })

        expect(result.status).toBe('success')
        expect(result.filter?.type).toBe('PeakingEq')
        expect(result.coefficients.a0).toBe(1)
      })

      it('should set biquad filter with coefficients', async () => {
        const mockResponse: BiquadResponse = {
          status: 'success',
          address: '0x2000',
          sampleRate: 48000,
          coefficients: {
            a0: 1,
            a1: -1.5,
            a2: 0.5,
            b0: 1.2,
            b1: -1.4,
            b2: 0.6
          }
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await setBiquadFilter({
          address: '0x2000',
          sampleRate: 48000,
          filter: {
            a0: 1,
            a1: -1.5,
            a2: 0.5,
            b0: 1.2,
            b1: -1.4,
            b2: 0.6
          }
        })

        expect(result.coefficients.b0).toBe(1.2)
      })
    })
  })

  describe('Register Access', () => {
    describe('readRegister', () => {
      it('should read register', async () => {
        const mockResponse = {
          address: '0x1000',
          values: ['0x12345678']
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await readRegister('0x1000')

        expect(result.address).toBe('0x1000')
        expect(result.values[0]).toBe('0x12345678')
      })

      it('should read register with length', async () => {
        const mockResponse = {
          address: '0x1000',
          values: ['0x12345678', '0x87654321']
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await readRegister('0x1000', 2)

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/register/0x1000/2'),
          expect.any(Object)
        )
      })
    })

    describe('writeRegister', () => {
      it('should write register', async () => {
        const mockResponse = {
          address: '0x1000',
          value: '0x12345678',
          status: 'success'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await writeRegister({
          address: '0x1000',
          value: '0x12345678'
        })

        expect(result.status).toBe('success')
      })
    })
  })

  describe('Frequency Response', () => {
    describe('calculateFrequencyResponse', () => {
      it('should calculate frequency response for filters', async () => {
        const mockResponse = {
          frequencies: [20, 50, 100, 500, 1000, 5000, 10000, 20000],
          response: [-3, -2, -1, 0, 1, 2, 3, 4]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await calculateFrequencyResponse({
          filters: [
            {
              type: 'PeakingEq',
              f: 1000,
              db: 6,
              q: 0.707
            }
          ]
        })

        expect(result.frequencies).toHaveLength(8)
        expect(result.response).toHaveLength(8)
      })

      it('should calculate frequency response with custom parameters', async () => {
        const mockResponse = {
          frequencies: [100, 200, 400, 800, 1600],
          response: [0, 1, 2, 1, 0]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await calculateFrequencyResponse({
          filters: [],
          frequencies: [100, 200, 400, 800, 1600],
          pointsPerOctave: 12
        })

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/frequency-response'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })
  })

  describe('Cache Management', () => {
    describe('getCacheStatus', () => {
      it('should return cache status', async () => {
        const mockResponse = {
          profile: {
            cached: true,
            path: '/cache/profile.xml',
            name: 'Default'
          },
          metadata: {
            cached: true,
            keyCount: 5,
            system: {
              profileName: 'Default',
              profileVersion: '1.0',
              sampleRate: 44100
            }
          }
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getCacheStatus()

        expect(result.profile.cached).toBe(true)
        expect(result.metadata.keyCount).toBe(5)
      })
    })

    describe('clearCache', () => {
      it('should clear cache', async () => {
        const mockResponse = { status: 'cleared' }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await clearCache()

        expect(result.status).toBe('cleared')
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cache/clear'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })
  })

  describe('DSP Profile', () => {
    describe('getDSPProfile', () => {
      it('should fetch DSP profile as text', async () => {
        const profileXml = '<?xml version="1.0"?><profile></profile>'

        const mockFetchResponse = new Response(profileXml, {
          status: 200,
          headers: { 'Content-Type': 'application/xml' }
        })
        mockFetchResponse.ok = true
        mockFetchResponse.text = vi.fn().mockResolvedValue(profileXml)

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getDSPProfile()

        expect(result).toContain('<?xml')
      })

      it('should throw error on non-OK response', async () => {
        const mockFetchResponse = new Response('Not Found', {
          status: 404,
          statusText: 'Not Found'
        })
        mockFetchResponse.ok = false

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await expect(getDSPProfile()).rejects.toThrow('Failed to get DSP profile: 404 Not Found')
      })
    })

    describe('updateDSPProfile', () => {
      it('should update DSP profile with XML', async () => {
        const mockResponse = {
          status: 'success',
          message: 'Profile updated',
          checksum: {
            memory: 'abc123',
            profile: 'def456',
            match: true
          }
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await updateDSPProfile({
          xml: '<?xml version="1.0"?><profile></profile>'
        })

        expect(result.status).toBe('success')
        expect(result.checksum.match).toBe(true)
      })

      it('should timeout on long-running update', async () => {
        vi.mocked(mockApiFetch).mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new Error()
            error.name = 'AbortError'
            reject(error)
          })
        })

        await expect(updateDSPProfile({ xml: '<profile></profile>' })).rejects.toThrow(
          /Request timeout \(exceeded 90 seconds\)/
        )
      })
    })

    describe('getDSPProfilesMetadata', () => {
      it('should fetch profiles metadata', async () => {
        const mockResponse = {
          profiles: {
            'default': {
              sampleRate: '48000',
              profileName: 'Default',
              profileVersion: '1.0',
              programID: '1234',
              modelName: 'ADAU1701',
              checksum: 'abc123',
              _system: {
                profileName: 'Default',
                profileVersion: '1.0',
                sampleRate: 48000,
                filename: 'default.xml',
                filepath: '/profiles/default.xml'
              }
            }
          },
          count: 1,
          directory: '/profiles'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getDSPProfilesMetadata()

        expect(result.count).toBe(1)
        expect(result.profiles['default']).toBeDefined()
      })
    })

    describe('Program Info and Checksum', () => {
      it('should get DSP program checksum', async () => {
        const mockResponse = {
          checksum: 'abc123def456',
          format: 'md5'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getDSPProgramChecksum()

        expect(result.format).toBe('md5')
        expect(result.checksum).toBeDefined()
      })

      it('should get DSP program info', async () => {
        const mockResponse = {
          program_length: 1024,
          checksums: {
            md5: 'abc123',
            sha1: 'def456'
          }
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getDSPProgramInfo()

        expect(result.program_length).toBe(1024)
        expect(result.checksums.md5).toBe('abc123')
      })
    })
  })

  describe('Filter Store', () => {
    describe('getStoredFilters', () => {
      it('should get stored filters', async () => {
        const mockResponse = {
          filters: {
            '0x1000:0': {
              address: '0x1000',
              offset: 0,
              filter: {
                type: 'PeakingEq',
                f: 1000,
                db: 6,
                q: 0.707
              },
              timestamp: 1234567890
            }
          },
          current: true
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await getStoredFilters({ current: true })

        expect(result.current).toBe(true)
        expect(result.filters['0x1000:0']).toBeDefined()
      })

      it('should get stored filters with checksum', async () => {
        const mockResponse = {
          filters: {},
          checksum: 'abc123'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await getStoredFilters({ checksum: 'abc123' })

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('checksum=abc123'),
          expect.any(Object)
        )
      })
    })

    describe('storeFilters', () => {
      it('should store filters', async () => {
        const mockResponse = {
          status: 'success',
          message: 'Filters stored'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await storeFilters({
          filters: [
            {
              address: '0x1000',
              filter: {
                type: 'PeakingEq',
                f: 1000,
                db: 6,
                q: 0.707
              }
            }
          ]
        })

        expect(result.status).toBe('success')
      })
    })

    describe('deleteStoredFilters', () => {
      it('should delete stored filters by address', async () => {
        const mockResponse = {
          status: 'success',
          message: 'Filters deleted'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await deleteStoredFilters({
          address: '0x1000'
        })

        expect(result.status).toBe('success')
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('address=0x1000'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      it('should delete all stored filters', async () => {
        const mockResponse = {
          status: 'success',
          message: 'All filters deleted'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await deleteStoredFilters({ all: true })

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('all=true'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })
  })

  describe('Filter Bypass', () => {
    describe('setFilterBypassState', () => {
      it('should set filter bypass state', async () => {
        const mockResponse: FilterBypassSetResponse = {
          status: 'success',
          message: 'Filter bypassed',
          checksum: 'abc123',
          address: '0x1000',
          offset: 0,
          bypassed: true
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await setFilterBypassState({
          address: '0x1000',
          offset: 0,
          bypassed: true,
          checksum: 'abc123'
        })

        expect(result.status).toBe('success')
        expect(result.bypassed).toBe(true)
      })

      it('should set bank bypass state', async () => {
        const mockResponse: FilterBypassSetResponse = {
          status: 'success',
          message: 'Bank bypassed',
          checksum: 'abc123',
          address: '0x1000',
          bypassed: true,
          bank_mode: true,
          total_filters: 4,
          successful: 4
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await setFilterBypassState({
          address: '0x1000',
          bank: true,
          bypassed: true
        })

        expect(result.bank_mode).toBe(true)
        expect(result.total_filters).toBe(4)
      })
    })

    describe('setFilterBankBypassState', () => {
      it('should bypass entire filter bank', async () => {
        const mockResponse: FilterBypassSetResponse = {
          status: 'success',
          message: 'Bank bypassed',
          checksum: 'abc123',
          address: '0x1000',
          bypassed: true,
          bank_mode: true,
          total_filters: 4
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await setFilterBankBypassState('0x1000', true, 'abc123')

        expect(result.status).toBe('success')
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/filters/bypass'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    describe('setIndividualFilterBypassState', () => {
      it('should bypass individual filter', async () => {
        const mockResponse: FilterBypassSetResponse = {
          status: 'success',
          message: 'Filter bypassed',
          checksum: 'abc123',
          address: '0x1000',
          offset: 2,
          bypassed: true
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await setIndividualFilterBypassState('0x1000', 2, false, 'abc123')

        expect(result.offset).toBe(2)
      })
    })
  })

  describe('Channel Settings', () => {
    describe('readChannelDelay', () => {
      it('should read channel delay', async () => {
        const mockResponse: MemoryReadResponse = {
          address: '0x3000',
          values: [1024]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await readChannelDelay(0x3000)

        expect(result).toBe(1024)
      })
    })

    describe('writeChannelDelay', () => {
      it('should write channel delay', async () => {
        const mockResponse: MemoryWriteResponse = {
          address: '0x3000',
          values: [2048],
          status: 'success'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await writeChannelDelay(0x3000, 2048)

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/memory'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    describe('readChannelLevel', () => {
      it('should read channel level', async () => {
        const mockResponse: MemoryReadResponse = {
          address: '0x4000',
          values: [1.0]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await readChannelLevel(0x4000)

        expect(result).toBe(1.0)
      })
    })

    describe('writeChannelLevel', () => {
      it('should write channel level with float value', async () => {
        const mockResponse: MemoryWriteResponse = {
          address: '0x4000',
          values: [2.5],
          status: 'success'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await writeChannelLevel(0x4000, 2.5)

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/memory'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      it('should nudge integer values for float conversion', async () => {
        const mockResponse: MemoryWriteResponse = {
          address: '0x4000',
          values: [1.0000001],
          status: 'success'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await writeChannelLevel(0x4000, 1)

        // Verify the nudged value was used
        const callArgs = vi.mocked(mockApiFetch).mock.calls[0]
        const bodyStr = callArgs[1]?.body as string
        expect(bodyStr).toContain('1.00')
      })
    })

    describe('readChannelInvert', () => {
      it('should read channel invert status', async () => {
        const mockResponse: MemoryReadResponse = {
          address: '0x5000',
          values: [1]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await readChannelInvert(0x5000)

        expect(result).toBe(true)
      })

      it('should return false for non-inverted channel', async () => {
        const mockResponse: MemoryReadResponse = {
          address: '0x5000',
          values: [0]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await readChannelInvert(0x5000)

        expect(result).toBe(false)
      })
    })

    describe('writeChannelInvert', () => {
      it('should write channel invert status', async () => {
        const mockResponse: MemoryWriteResponse = {
          address: '0x5000',
          values: [1],
          status: 'success'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await writeChannelInvert(0x5000, true)

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/memory'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    describe('readChannelSelect', () => {
      it('should read channel select mode', async () => {
        const mockResponse: MemoryReadResponse = {
          address: '0x6000',
          values: [3]
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await readChannelSelect(0x6000)

        expect(result).toBe(3)
      })
    })

    describe('writeChannelSelect', () => {
      it('should write channel select mode', async () => {
        const mockResponse: MemoryWriteResponse = {
          address: '0x6000',
          values: [2],
          status: 'success'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        await writeChannelSelect(0x6000, 2)

        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/memory'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })
  })

  describe('DSP Toolkit Status Check', () => {
    describe('check_dsp_toolkit', () => {
      it('should return "yes" when DSP is detected', async () => {
        const mockResponse: DetectedDSP = {
          detected_dsp: 'ADAU1701',
          status: 'detected'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await check_dsp_toolkit()

        expect(result).toBe('yes')
      })

      it('should return "no" when DSP is not detected', async () => {
        const mockResponse: DetectedDSP = {
          detected_dsp: '',
          status: 'not_detected'
        }

        const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        mockFetchResponse.ok = true

        vi.mocked(mockApiFetch).mockResolvedValueOnce(mockFetchResponse)

        const result = await check_dsp_toolkit()

        expect(result).toBe('no')
      })

      it('should return "backend_error" on timeout', async () => {
        vi.mocked(mockApiFetch).mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new Error('Request timeout')
            reject(error)
          })
        })

        const result = await check_dsp_toolkit()

        expect(result).toBe('backend_error')
      })

      it('should return "backend_error" on fetch error', async () => {
        vi.mocked(mockApiFetch).mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new Error('fetch failed')
            reject(error)
          })
        })

        const result = await check_dsp_toolkit()

        expect(result).toBe('backend_error')
      })

      it('should return "backend_error" on HiFiBerry software unavailable', async () => {
        vi.mocked(mockApiFetch).mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new Error('HiFiBerry DSP software not available')
            reject(error)
          })
        })

        const result = await check_dsp_toolkit()

        expect(result).toBe('backend_error')
      })

      it('should return "backend_error" on HTTP 500', async () => {
        vi.mocked(mockApiFetch).mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new Error('HTTP 503: Service Unavailable')
            reject(error)
          })
        })

        const result = await check_dsp_toolkit()

        expect(result).toBe('backend_error')
      })
    })
  })
})
