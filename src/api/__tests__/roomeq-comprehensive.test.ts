import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as roomeq from '@/api/roomeq'
import * as httpApi from '@/api/http'
import { useAppConfigStore } from '@/stores/appconfig'

// Mock dependencies
vi.mock('@/api/http')
vi.mock('@/stores/appconfig')

describe('RoomEQ API - Comprehensive Unit & Regression Tests', () => {
  const mockBaseUrl = 'http://localhost:8888/roomeq'

  let mockConfigStore: any
  let mockApiFetch: any

  beforeEach(() => {
    // Create fresh mocks for each test
    mockConfigStore = {
      getRoomEQApiBaseUrl: vi.fn(() => mockBaseUrl)
    }

    mockApiFetch = vi.fn()

    vi.mocked(useAppConfigStore).mockReturnValue(mockConfigStore)
    vi.mocked(httpApi.apiFetch).mockImplementation(mockApiFetch)

    // Clear console mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============= INFO & VERSION TESTS =============
  describe('API Info & Version Functions', () => {
    describe('getRoomEQInfo', () => {
      it('should fetch API info successfully', async () => {
        const mockInfo: roomeq.RoomEQApiInfo = {
          message: 'RoomEQ API',
          version: '1.0.0',
          description: 'Room equalization API',
          endpoints: {
            info: ['/'],
            microphones: ['/microphones'],
            audio_devices: ['/audio/inputs', '/audio/cards'],
            measurements: ['/audio/analyze/fft-recording'],
            signal_generation: ['/audio/noise/start', '/audio/sweep/start']
          },
          usage: {}
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockInfo), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQInfo()

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockInfo)
        expect(mockApiFetch).toHaveBeenCalledWith(`${mockBaseUrl}/`, expect.any(Object))
      })

      it('should handle API info fetch errors gracefully', async () => {
        mockApiFetch.mockResolvedValue(
          new Response('Server error', { status: 500 })
        )

        const result = await roomeq.getRoomEQInfo()

        expect(result.success).toBe(false)
        expect(result.detail).toBeDefined()
      })
    })

    describe('getRoomEQVersion', () => {
      it('should fetch version information successfully', async () => {
        const mockVersion: roomeq.RoomEQVersionInfo = {
          version: '1.0.0',
          api_name: 'RoomEQ',
          features: ['microphone_detection', 'fft_analysis']
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockVersion), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQVersion()

        expect(result.success).toBe(true)
        expect(result.data?.version).toBe('1.0.0')
      })

      it('should detect HTML response (proxy not working)', async () => {
        mockApiFetch.mockResolvedValue(
          new Response('<!DOCTYPE html><html></html>', {
            status: 200,
            headers: { 'content-type': 'text/html' }
          })
        )

        const result = await roomeq.getRoomEQVersion()

        expect(result.success).toBe(false)
        expect(result.detail).toContain('HTML')
      })
    })

    describe('isVersionAtLeast', () => {
      it('should return true for equal versions', () => {
        expect(roomeq.isVersionAtLeast('1.2.3', '1.2.3')).toBe(true)
      })

      it('should return true when first version is greater', () => {
        expect(roomeq.isVersionAtLeast('2.0.0', '1.9.9')).toBe(true)
        expect(roomeq.isVersionAtLeast('1.3.0', '1.2.9')).toBe(true)
        expect(roomeq.isVersionAtLeast('1.2.4', '1.2.3')).toBe(true)
      })

      it('should return false when first version is less', () => {
        expect(roomeq.isVersionAtLeast('0.9.9', '1.0.0')).toBe(false)
        expect(roomeq.isVersionAtLeast('1.2.3', '1.2.4')).toBe(false)
      })

      it('should handle versions with missing components', () => {
        expect(roomeq.isVersionAtLeast('1.2', '1.2.0')).toBe(true)
        expect(roomeq.isVersionAtLeast('1', '1.0.0')).toBe(true)
      })

      it('should handle non-numeric version parts gracefully', () => {
        expect(roomeq.isVersionAtLeast('1.2.a', '1.2.0')).toBe(true) // 'a' parses to 0
      })
    })

    describe('checkRoomEQVersionRequirement', () => {
      it('should pass when API version meets minimum requirement', async () => {
        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify({ version: '1.0.0' }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.checkRoomEQVersionRequirement()

        expect(result.success).toBe(true)
      })

      it('should fail when API version is below minimum', async () => {
        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify({ version: '0.5.0' }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.checkRoomEQVersionRequirement()

        expect(result.success).toBe(false)
        expect(result.error).toContain('not supported')
      })
    })
  })

  // ============= AUDIO DEVICE & MICROPHONE TESTS =============
  describe('Audio Devices & Microphones', () => {
    describe('getRoomEQMicrophones', () => {
      it('should fetch microphones successfully', async () => {
        const mockMics: roomeq.RoomEQMicrophone[] = [
          {
            card_index: 0,
            device_name: 'USB Mic',
            sensitivity: -38,
            sensitivity_str: '-38 dBV/Pa',
            gain_db: 0
          }
        ]

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockMics), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQMicrophones()

        expect(result.success).toBe(true)
        expect(Array.isArray(result.data)).toBe(true)
        expect(result.data?.[0]?.device_name).toBe('USB Mic')
      })

      it('should handle non-JSON response gracefully', async () => {
        mockApiFetch.mockResolvedValue(
          new Response('Not JSON', {
            status: 200,
            headers: { 'content-type': 'text/plain' }
          })
        )

        const result = await roomeq.getRoomEQMicrophones()

        expect(result.success).toBe(false)
        expect(result.detail).toContain('non-JSON')
      })
    })

    describe('getRoomEQAudioInputs', () => {
      it('should fetch audio inputs successfully', async () => {
        const mockInputs: roomeq.RoomEQAudioInputs = {
          input_cards: [0, 1],
          count: 2
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockInputs), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQAudioInputs()

        expect(result.success).toBe(true)
        expect(result.data?.count).toBe(2)
      })
    })

    describe('getRoomEQAudioCards', () => {
      it('should fetch audio cards successfully', async () => {
        const mockCards: roomeq.RoomEQAudioCards = {
          cards: ['hw:0', 'hw:1'],
          count: 2
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockCards), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQAudioCards()

        expect(result.success).toBe(true)
        expect(result.data?.cards).toHaveLength(2)
      })
    })
  })

  // ============= SIGNAL GENERATION TESTS =============
  describe('Signal Generation & Playback', () => {
    describe('startRoomEQNoise', () => {
      it('should start noise playback with default parameters', async () => {
        const mockResponse: roomeq.RoomEQSignalResponse = {
          message: 'Noise started',
          status: 'playing',
          filename: 'noise_12345.wav'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.startRoomEQNoise()

        expect(result.success).toBe(true)
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/audio/noise/start'),
          expect.any(Object)
        )
      })

      it('should start noise with custom amplitude and duration', async () => {
        const mockResponse: roomeq.RoomEQSignalResponse = {
          message: 'Noise started',
          status: 'playing'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        await roomeq.startRoomEQNoise(0.8, 5.0)

        const callUrl = (mockApiFetch.mock.calls[0]?.[0] as string) || ''
        expect(callUrl).toContain('amplitude=0.8')
        expect(callUrl).toContain('duration=5')
      })
    })

    describe('stopRoomEQNoise', () => {
      it('should stop noise playback', async () => {
        const mockResponse: roomeq.RoomEQSignalResponse = {
          message: 'Noise stopped',
          status: 'stopped'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.stopRoomEQNoise()

        expect(result.success).toBe(true)
        expect(mockApiFetch).toHaveBeenCalledWith(
          `${mockBaseUrl}/audio/noise/stop`,
          expect.any(Object)
        )
      })
    })

    describe('getRoomEQNoiseStatus', () => {
      it('should fetch noise status when active', async () => {
        const mockStatus: roomeq.RoomEQNoiseStatus = {
          active: true,
          signal_type: 'noise',
          amplitude: 0.5,
          device: 'hw:0',
          remaining_seconds: 2.5,
          stop_time: '2024-01-01T12:00:05Z'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockStatus), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQNoiseStatus()

        expect(result.success).toBe(true)
        expect(result.data?.active).toBe(true)
        expect(result.data?.remaining_seconds).toBe(2.5)
      })
    })

    describe('startRoomEQSweep', () => {
      it('should start sine sweep with default parameters', async () => {
        const mockResponse: roomeq.RoomEQSweepStartResponse = {
          status: 'playing',
          signal_type: 'sine_sweep',
          start_freq: 10,
          end_freq: 22000,
          duration: 10,
          sweeps: 1,
          total_duration: 10,
          amplitude: 0.5,
          device: 'hw:0',
          stop_time: '2024-01-01T12:00:10Z'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.startRoomEQSweep()

        expect(result.success).toBe(true)
        expect(result.data?.signal_type).toBe('sine_sweep')
      })

      it('should start sweep with custom parameters', async () => {
        const mockResponse: roomeq.RoomEQSweepStartResponse = {
          status: 'playing',
          signal_type: 'sine_sweep',
          start_freq: 50,
          end_freq: 10000,
          duration: 5,
          sweeps: 2,
          total_duration: 10,
          amplitude: 0.7,
          device: 'hw:1',
          stop_time: '2024-01-01T12:00:10Z'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        await roomeq.startRoomEQSweep({
          startFreq: 50,
          endFreq: 10000,
          duration: 5,
          sweeps: 2,
          amplitude: 0.7,
          device: 'hw:1'
        })

        const callUrl = (mockApiFetch.mock.calls[0]?.[0] as string) || ''
        expect(callUrl).toContain('start_freq=50')
        expect(callUrl).toContain('end_freq=10000')
        expect(callUrl).toContain('sweeps=2')
      })
    })
  })

  // ============= RECORDING TESTS =============
  describe('Recording Functions', () => {
    describe('startRoomEQRecording', () => {
      it('should start recording with duration', async () => {
        const mockResponse: roomeq.RoomEQRecordingStartResponse = {
          status: 'recording',
          recording_id: 'rec-123',
          filename: 'rec-123.wav',
          duration: 10
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.startRoomEQRecording({ duration: 10 })

        expect(result.success).toBe(true)
        expect(result.data?.recording_id).toBe('rec-123')
      })

      it('should support optional sample rate parameter', async () => {
        const mockResponse: roomeq.RoomEQRecordingStartResponse = {
          status: 'recording',
          recording_id: 'rec-456',
          filename: 'rec-456.wav',
          duration: 5
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        await roomeq.startRoomEQRecording({
          duration: 5,
          sampleRate: 48000,
          device: 'hw:0'
        })

        const callUrl = (mockApiFetch.mock.calls[0]?.[0] as string) || ''
        expect(callUrl).toContain('sample_rate=48000')
        expect(callUrl).toContain('device=hw')
      })
    })

    describe('getRoomEQRecordingStatus', () => {
      it('should fetch recording status by ID', async () => {
        const mockStatus: roomeq.RoomEQRecordingStatusResponse = {
          status: 'recording',
          recording_id: 'rec-123',
          state: 'recording',
          remaining_seconds: 5
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockStatus), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQRecordingStatus('rec-123')

        expect(result.success).toBe(true)
        expect(result.data?.state).toBe('recording')
      })

      it('should handle numeric recording IDs', async () => {
        const mockStatus: roomeq.RoomEQRecordingStatusResponse = {
          status: 'completed',
          recording_id: 123,
          state: 'completed',
          filename: 'rec-123.wav'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockStatus), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQRecordingStatus(123)

        expect(result.success).toBe(true)
        expect(mockApiFetch).toHaveBeenCalledWith(
          expect.stringContaining('/audio/record/status/123'),
          expect.any(Object)
        )
      })
    })
  })

  // ============= FFT ANALYSIS TESTS =============
  describe('FFT Analysis Functions', () => {
    describe('analyzeRoomEQFFTRecording', () => {
      it('should analyze FFT for a recording', async () => {
        const mockFFT: roomeq.RoomEQFFTResponse = {
          status: 'success',
          fft_analysis: {
            fft_size: 2048,
            window_type: 'hann',
            sample_rate: 48000,
            frequency_resolution: 23.4375,
            frequencies: [20, 100, 1000],
            magnitudes: [-30, -20, -10],
            phases: [0, 45, 90],
            peak_frequency: 1000,
            peak_magnitude: -10,
            spectral_centroid: 500,
            normalization: { applied: false },
            frequency_bands: {
              sub_bass: { range: '20-60', avg_magnitude: -35, peak_frequency: 40 },
              bass: { range: '60-250', avg_magnitude: -30, peak_frequency: 100 },
              low_midrange: { range: '250-500', avg_magnitude: -25, peak_frequency: 400 },
              midrange: { range: '500-2000', avg_magnitude: -15, peak_frequency: 1000 },
              upper_midrange: { range: '2000-4000', avg_magnitude: -20, peak_frequency: 3000 },
              presence: { range: '4000-6000', avg_magnitude: -25, peak_frequency: 5000 },
              brilliance: { range: '6000-22000', avg_magnitude: -30, peak_frequency: 10000 }
            }
          },
          analysis_timestamp: '2024-01-01T12:00:00Z'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockFFT), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.analyzeRoomEQFFTRecording('rec-123')

        expect(result.success).toBe(true)
        expect(result.data?.fft_analysis.frequencies).toHaveLength(3)
        expect(result.data?.fft_analysis.peak_frequency).toBe(1000)
      })

      it('should support normalization and FFT size parameters', async () => {
        const mockFFT: roomeq.RoomEQFFTResponse = {
          status: 'success',
          fft_analysis: {
            fft_size: 4096,
            window_type: 'hann',
            sample_rate: 48000,
            frequency_resolution: 11.71875,
            frequencies: [20, 100],
            magnitudes: [0, 0],
            phases: [0, 0],
            peak_frequency: 100,
            peak_magnitude: 0,
            spectral_centroid: 60,
            normalization: { applied: false },
            frequency_bands: {
              sub_bass: { range: '20-60', avg_magnitude: 0, peak_frequency: 40 },
              bass: { range: '60-250', avg_magnitude: 0, peak_frequency: 100 },
              low_midrange: { range: '250-500', avg_magnitude: 0, peak_frequency: 400 },
              midrange: { range: '500-2000', avg_magnitude: 0, peak_frequency: 1000 },
              upper_midrange: { range: '2000-4000', avg_magnitude: 0, peak_frequency: 3000 },
              presence: { range: '4000-6000', avg_magnitude: 0, peak_frequency: 5000 },
              brilliance: { range: '6000-22000', avg_magnitude: 0, peak_frequency: 10000 }
            }
          },
          analysis_timestamp: '2024-01-01T12:00:00Z'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockFFT), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        await roomeq.analyzeRoomEQFFTRecording('rec-123', 1000, 4096, 24)

        const callUrl = (mockApiFetch.mock.calls[0]?.[0] as string) || ''
        expect(callUrl).toContain('fft_size=4096')
        expect(callUrl).toContain('points_per_octave=24')
      })
    })

    describe('analyzeRoomEQFFTDifference', () => {
      it('should analyze FFT difference between two files', async () => {
        const mockDiff: roomeq.RoomEQFFTDifferenceResponse = {
          status: 'success',
          comparison_info: {
            analysis_parameters: {
              fft_size: 2048,
              window_type: 'hann',
              normalize: null,
              points_per_octave: 16,
              psychoacoustic_smoothing: null,
              analyzed_duration: 10,
              analyzed_samples: 480000,
              start_time: 0
            },
            file1: {
              filename: 'noise.wav',
              peak_frequency: 1000,
              peak_magnitude: -10,
              spectral_centroid: 500
            },
            file2: {
              filename: 'rec-123.wav',
              peak_frequency: 1200,
              peak_magnitude: -15,
              spectral_centroid: 600
            }
          },
          difference_analysis: {
            title: 'FFT Difference',
            description: 'Difference between files',
            diff_type: 'magnitude',
            frequencies: [20, 100],
            magnitudes: [-5, -10],
            phases: [0, 45],
            sample_rate: 48000,
            peak_frequency: 100,
            peak_magnitude: -5,
            source_info: {
              result1_title: 'File 1',
              result2_title: 'File 2',
              result1_peak_freq: 1000,
              result2_peak_freq: 1200
            },
            spectral_density: {
              type: 'magnitude',
              description: 'Magnitude spectrum',
              units: 'dB',
              computation: 'FFT difference'
            },
            statistics: {
              n_points: 2,
              frequency_range: [20, 100],
              mean_difference_db: -7.5,
              rms_difference_db: -7.5,
              max_difference_db: -5
            }
          },
          individual_analyses: {
            file1_fft: {
              peak_frequency: 1000,
              peak_magnitude: -10,
              spectral_centroid: 500
            },
            file2_fft: {
              peak_frequency: 1200,
              peak_magnitude: -15,
              spectral_centroid: 600
            }
          }
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockDiff), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.analyzeRoomEQFFTDifference('noise.wav', 'rec-123', 'filename', 'recording_id')

        expect(result.success).toBe(true)
        expect(result.data?.difference_analysis.frequencies).toHaveLength(2)
      })

      it('should handle various source type combinations', async () => {
        const mockDiff: roomeq.RoomEQFFTDifferenceResponse = {
          status: 'success',
          comparison_info: {
            analysis_parameters: {
              fft_size: 2048,
              window_type: 'hann',
              normalize: null,
              points_per_octave: 16,
              psychoacoustic_smoothing: null,
              analyzed_duration: 10,
              analyzed_samples: 480000,
              start_time: 0
            },
            file1: { filename: 'f1', peak_frequency: 100, peak_magnitude: 0, spectral_centroid: 50 },
            file2: { filename: 'f2', peak_frequency: 200, peak_magnitude: 0, spectral_centroid: 150 }
          },
          difference_analysis: {
            title: 'Diff',
            description: 'Diff',
            diff_type: 'magnitude',
            frequencies: [100],
            magnitudes: [0],
            phases: [0],
            sample_rate: 48000,
            peak_frequency: 100,
            peak_magnitude: 0,
            source_info: {
              result1_title: 'F1',
              result2_title: 'F2',
              result1_peak_freq: 100,
              result2_peak_freq: 200
            },
            spectral_density: { type: 'mag', description: 'mag', units: 'dB', computation: 'fft' },
            statistics: {
              n_points: 1,
              frequency_range: [100, 100],
              mean_difference_db: 0,
              rms_difference_db: 0,
              max_difference_db: 0
            }
          },
          individual_analyses: {
            file1_fft: { peak_frequency: 100, peak_magnitude: 0, spectral_centroid: 50 },
            file2_fft: { peak_frequency: 200, peak_magnitude: 0, spectral_centroid: 150 }
          }
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockDiff), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        await roomeq.analyzeRoomEQFFTDifference('path/file1', 'path/file2', 'filepath', 'filepath')

        const callUrl = (mockApiFetch.mock.calls[0]?.[0] as string) || ''
        expect(callUrl).toContain('filepath1=')
        expect(callUrl).toContain('filepath2=')
      })
    })
  })

  // ============= EQ OPTIMIZATION TESTS =============
  describe('EQ Optimization Functions', () => {
    describe('getRoomEQTargetPresets', () => {
      it('should fetch target presets successfully', async () => {
        const mockPresets: roomeq.RoomEQTargetPresets = {
          count: 2,
          success: true,
          target_curves: [
            {
              key: 'flat',
              name: 'Flat',
              description: 'Flat response',
              expert: false,
              curve: [
                { frequency: 20, target_db: 0, weight: null },
                { frequency: 22000, target_db: 0, weight: null }
              ]
            },
            {
              key: 'harman',
              name: 'Harman',
              description: 'Harman curve',
              expert: true,
              curve: [
                { frequency: 20, target_db: -2, weight: 1.0 },
                { frequency: 22000, target_db: -5, weight: 1.0 }
              ]
            }
          ]
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockPresets), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQTargetPresets()

        expect(result.success).toBe(true)
        expect(result.data?.target_curves).toHaveLength(2)
        expect(result.data?.target_curves[0].key).toBe('flat')
      })

      it('should provide fallback flat curve on error', async () => {
        mockApiFetch.mockResolvedValue(
          new Response('Server error', { status: 500 })
        )

        const result = await roomeq.getRoomEQTargetPresets()

        expect(result.success).toBe(false)
        expect(result.data?.target_curves).toHaveLength(1)
        expect(result.data?.target_curves[0].key).toBe('flat')
      })
    })

    describe('getRoomEQOptimizerPresets', () => {
      it('should fetch optimizer presets successfully', async () => {
        const mockPresets: roomeq.RoomEQOptimizerPresets = {
          count: 2,
          success: true,
          optimizer_presets: [
            {
              key: 'default',
              preset: 'default',
              name: 'Default',
              description: 'Balanced',
              qmax: 10,
              mindb: -10,
              maxdb: 3,
              add_highpass: true
            },
            {
              key: 'aggressive',
              preset: 'aggressive',
              name: 'Aggressive',
              description: 'Strong correction',
              qmax: 20,
              mindb: -15,
              maxdb: 6,
              add_highpass: true
            }
          ]
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockPresets), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQOptimizerPresets()

        expect(result.success).toBe(true)
        expect(result.data?.optimizer_presets).toHaveLength(2)
      })

      it('should provide fallback default preset on error', async () => {
        mockApiFetch.mockResolvedValue(
          new Response('Error', { status: 500 })
        )

        const result = await roomeq.getRoomEQOptimizerPresets()

        expect(result.data?.optimizer_presets).toHaveLength(1)
        expect(result.data?.optimizer_presets[0].key).toBe('default')
      })
    })

    describe('getRoomEQOptimizationTargetCurves', () => {
      it('should fetch available target curve names', async () => {
        const mockCurves = ['flat', 'harman', 'b_k_in_room']

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockCurves), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.getRoomEQOptimizationTargetCurves()

        expect(result.success).toBe(true)
        expect(result.data).toContain('flat')
      })

      it('should provide fallback curves when endpoint not found', async () => {
        mockApiFetch.mockResolvedValue(
          new Response('Not found', { status: 404 })
        )

        const result = await roomeq.getRoomEQOptimizationTargetCurves()

        expect(result.success).toBe(true)
        expect(result.data).toContain('flat')
        expect(result.data).toContain('harman')
      })
    })
  })

  // ============= MEASUREMENT TESTS =============
  describe('Room Measurement Functions', () => {
    describe('startRoomMeasurementSession', () => {
      it('should start measurement session with default parameters', async () => {
        const noiseResponse: roomeq.RoomEQSignalResponse = {
          message: 'Noise started',
          status: 'playing',
          filename: 'noise.wav'
        }

        const recordingResponse: roomeq.RoomEQRecordingStartResponse = {
          status: 'recording',
          recording_id: 'rec-1',
          filename: 'rec-1.wav',
          duration: 10
        }

        mockApiFetch
          .mockResolvedValueOnce(
            new Response(JSON.stringify(noiseResponse), {
              status: 200,
              headers: { 'content-type': 'application/json' }
            })
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify(recordingResponse), {
              status: 200,
              headers: { 'content-type': 'application/json' }
            })
          )

        const result = await roomeq.startRoomMeasurementSession()

        expect(result.success).toBe(true)
        expect(result.data?.noiseFilename).toBe('noise.wav')
        expect(result.data?.recordingId).toBe('rec-1')
      })

      it('should handle measurement session with custom parameters', async () => {
        const noiseResponse: roomeq.RoomEQSignalResponse = {
          message: 'Noise started',
          status: 'playing',
          filename: 'noise_custom.wav'
        }

        const recordingResponse: roomeq.RoomEQRecordingStartResponse = {
          status: 'recording',
          recording_id: 'rec-custom',
          filename: 'rec-custom.wav',
          duration: 5
        }

        mockApiFetch
          .mockResolvedValueOnce(
            new Response(JSON.stringify(noiseResponse), {
              status: 200,
              headers: { 'content-type': 'application/json' }
            })
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify(recordingResponse), {
              status: 200,
              headers: { 'content-type': 'application/json' }
            })
          )

        const result = await roomeq.startRoomMeasurementSession(5, 0.8)

        expect(result.success).toBe(true)
      })
    })

    describe('startRoomMeasure', () => {
      it('should perform complete room measurement', async () => {
        const mockResponse: roomeq.RoomMeasureResponse = {
          status: 'success',
          device: 'hw:0',
          channel: 'both',
          count: 1,
          fft_points: 64,
          csv_path: '/data/measurement.csv',
          fft: {
            frequencies: [20, 100, 1000, 20000],
            magnitudes_db: [-30, -20, -10, -35],
            phase: [0, 45, 90, 180],
            points: 4
          },
          message: 'Measurement complete'
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const result = await roomeq.startRoomMeasure({
          device: 'hw:0',
          channel: 'both',
          count: 1
        })

        expect(result.success).toBe(true)
        expect(result.data?.fft.points).toBe(4)
      })
    })
  })

  // ============= USABLE FREQUENCY RANGE TESTS =============
  describe('Usable Frequency Range Detection', () => {
    describe('detectUsableFrequencyRange', () => {
      it('should detect usable frequency range from measured curve', async () => {
        const mockResult: roomeq.RoomEQUsableRangeResult = {
          success: true,
          usable_freq_low: 40,
          usable_freq_high: 15000,
          recommended_min: 50,
          recommended_max: 14000,
          min_frequency: 20,
          max_frequency: 20000,
          analysis: {
            low_frequency_rolloff: 0.5,
            high_frequency_rolloff: 0.3,
            noise_floor_estimate: -40
          }
        }

        mockApiFetch.mockResolvedValue(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )

        const payload: roomeq.RoomEQUsableRangeRequest = {
          measured_curve: {
            frequencies: [20, 100, 1000, 20000],
            magnitudes_db: [-30, -10, 0, -25]
          }
        }

        const result = await roomeq.detectUsableFrequencyRange(payload)

        expect(result.success).toBe(true)
        expect(result.data?.usable_freq_low).toBe(40)
        expect(result.data?.usable_freq_high).toBe(15000)
      })
    })
  })

  // ============= ERROR CONSISTENCY TESTS =============
  describe('Error Handling Consistency', () => {
    it('should consistently return success: false with detail field on error', async () => {
      mockApiFetch.mockResolvedValue(
        new Response('Server Error', { status: 500 })
      )

      const result1 = await roomeq.getRoomEQInfo()
      const result2 = await roomeq.getRoomEQMicrophones()
      const result3 = await roomeq.startRoomEQNoise()

      expect(result1.success).toBe(false)
      expect(result1.detail).toBeDefined()
      expect(result2.success).toBe(false)
      expect(result2.detail).toBeDefined()
      expect(result3.success).toBe(false)
      expect(result3.detail).toBeDefined()
    })

    it('should handle network errors gracefully', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'))

      const result = await roomeq.getRoomEQVersion()

      expect(result.success).toBe(false)
      expect(result.detail).toContain('error')
    })
  })

  // ============= INTERFACE VALIDATION TESTS =============
  describe('Type Interface Validation', () => {
    it('should validate RoomEQApiEnvelope structure', () => {
      const envelope: roomeq.RoomEQApiEnvelope<{ test: string }> = {
        success: true,
        data: { test: 'value' },
        detail: 'Optional detail'
      }

      expect(envelope.success).toBe(true)
      expect(envelope.data?.test).toBe('value')
    })

    it('should distinguish between legacy and new optimization results', () => {
      const legacyResult: roomeq.RoomEQOptimizationResult = {
        optimization_id: 'id',
        status: 'completed',
        success: true,
        target_curve: 'flat',
        optimizer_preset: 'default',
        processing_time: 100,
        final_rms_error: 0.5,
        improvement_db: 3.0,
        filters: [],
        frequency_response: {
          frequencies: [20],
          original_response: [0],
          corrected_response: [0],
          target_response: [0]
        },
        timestamp: '2024-01-01T00:00:00Z'
      }

      const newResult: roomeq.NewRoomEQOptimizationResult = {
        success: true,
        filters: [],
        final_error: 0.5,
        original_error: 1.0,
        improvement_db: 3.0,
        processing_time_ms: 100,
        error_message: null,
        usable_freq_low: 20,
        usable_freq_high: 20000
      }

      expect(legacyResult.optimization_id).toBeDefined()
      expect(newResult.usable_freq_low).toBeDefined()
      expect('optimization_id' in legacyResult).toBe(true)
      expect('optimization_id' in newResult).toBe(false)
    })
  })

  // ============= CONSTANTS VALIDATION TESTS =============
  describe('Constants Validation', () => {
    it('should define ROOMEQ_MINIMUM_VERSION constant', () => {
      expect(roomeq.ROOMEQ_MINIMUM_VERSION).toBeDefined()
      expect(typeof roomeq.ROOMEQ_MINIMUM_VERSION).toBe('string')
      expect(roomeq.ROOMEQ_MINIMUM_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('should define PRERECORDED_SWEEP_SIGNAL constant', () => {
      expect(roomeq.PRERECORDED_SWEEP_SIGNAL).toBeDefined()
      expect(typeof roomeq.PRERECORDED_SWEEP_SIGNAL).toBe('string')
    })
  })
})
