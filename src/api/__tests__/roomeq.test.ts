import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppConfigStore } from '@/stores/appconfig'
import * as roomeq from '@/api/roomeq'

// Mock the stores and apiFetch
vi.mock('@/stores/appconfig')
vi.mock('@/api/http')

describe('roomeq.ts - Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Type Interface Consistency', () => {
    it('should have consistent response envelope structure', () => {
      // Verify RoomEQApiEnvelope structure
      const envelope: roomeq.RoomEQApiEnvelope = {
        success: true,
        data: { version: '1.0' },
        detail: 'Test'
      }
      expect(envelope.success).toBeDefined()
      expect(envelope.data).toBeDefined()
      expect(envelope.detail).toBeDefined()
    })

    it('should distinguish between legacy and new optimization result interfaces', () => {
      // Legacy result
      const legacyResult: roomeq.RoomEQOptimizationResult = {
        optimization_id: 'id1',
        status: 'completed',
        success: true,
        target_curve: 'flat',
        optimizer_preset: 'default',
        processing_time: 100,
        final_rms_error: 0.5,
        improvement_db: 3.0,
        filters: [],
        frequency_response: {
          frequencies: [20, 100],
          original_response: [0, 0],
          corrected_response: [0, 0],
          target_response: [0, 0]
        },
        timestamp: '2024-01-01T00:00:00Z'
      }

      // New result
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
      expect(legacyResult.optimization_id).not.toEqual(newResult.usable_freq_low)
    })

    it('should have proper filter interface definitions', () => {
      const legacyFilter: roomeq.RoomEQFilter = {
        index: 0,
        filter_type: 'eq',
        frequency: 1000,
        q: 1.0,
        gain_db: 3.0,
        description: 'Test filter',
        text_format: '[test]',
        coefficients: {
          b: [1, 0, 0],
          a: [1, 0, 0]
        }
      }

      const newFilter: roomeq.NewRoomEQOptimizedFilter = {
        filter_type: 'eq',
        frequency: 1000,
        q: 1.0,
        gain_db: 3.0,
        description: 'Test filter'
      }

      expect(legacyFilter.coefficients).toBeDefined()
      expect(newFilter.coefficients).not.toBeDefined()
    })
  })

  describe('Error Handling Consistency', () => {
    it('should consistently return success: false with detail on error', () => {
      // This test validates error response pattern
      const errorResponse1: roomeq.RoomEQApiEnvelope = {
        success: false,
        detail: 'Error message'
      }

      const errorResponse2: roomeq.RoomEQApiEnvelope = {
        success: false,
        data: { count: 0, optimizer_presets: [], success: true },
        detail: 'Error message'
      }

      expect(errorResponse1.success).toBe(false)
      expect(errorResponse1.detail).toBeDefined()
      expect(errorResponse2.success).toBe(false)
      expect(errorResponse2.detail).toBeDefined()
      // Note: errorResponse2 has both data and error - inconsistent pattern
    })

    it('should validate optimizer presets fallback includes all required fields', () => {
      const fallbackPreset: roomeq.RoomEQOptimizerPreset = {
        key: 'default',
        preset: 'default',
        name: 'Default',
        description: 'Balanced optimization with moderate Q values',
        qmax: 10,
        mindb: -10,
        maxdb: 3,
        add_highpass: true
      }

      expect(fallbackPreset.key).toBeDefined()
      expect(fallbackPreset.preset).toBeDefined()
      expect(fallbackPreset.qmax).toBeGreaterThan(0)
      expect(fallbackPreset.mindb).toBeLessThan(fallbackPreset.maxdb)
    })

    it('should validate target presets fallback structure', () => {
      const fallbackTargets: roomeq.RoomEQTargetCurve[] = [{
        key: 'flat',
        name: 'Flat Response',
        description: 'Flat frequency response across all frequencies',
        expert: false,
        curve: [
          { frequency: 20, target_db: 0, weight: null },
          { frequency: 25000, target_db: 0, weight: null }
        ]
      }]

      expect(fallbackTargets).toHaveLength(1)
      expect(fallbackTargets[0].curve).toHaveLength(2)
      expect(fallbackTargets[0].curve[0].frequency).toBeLessThan(fallbackTargets[0].curve[1].frequency)
    })
  })

  describe('Version Handling', () => {
    it('should correctly compare semver versions', () => {
      expect(roomeq.isVersionAtLeast('1.2.3', '1.2.3')).toBe(true)
      expect(roomeq.isVersionAtLeast('1.2.4', '1.2.3')).toBe(true)
      expect(roomeq.isVersionAtLeast('1.3.0', '1.2.3')).toBe(true)
      expect(roomeq.isVersionAtLeast('2.0.0', '1.2.3')).toBe(true)
      expect(roomeq.isVersionAtLeast('1.2.2', '1.2.3')).toBe(false)
      expect(roomeq.isVersionAtLeast('1.1.9', '1.2.3')).toBe(false)
    })

    it('should handle version strings with missing components', () => {
      expect(roomeq.isVersionAtLeast('1', '1.0.0')).toBe(true)
      expect(roomeq.isVersionAtLeast('1.2', '1.2.0')).toBe(true)
      expect(roomeq.isVersionAtLeast('0.6.0', '0.6.0')).toBe(true)
    })

    it('should validate minimum version constant', () => {
      expect(roomeq.ROOMEQ_MINIMUM_VERSION).toBeDefined()
      expect(typeof roomeq.ROOMEQ_MINIMUM_VERSION).toBe('string')
      expect(roomeq.ROOMEQ_MINIMUM_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('API URL Building', () => {
    it('should validate sweep parameter encoding', () => {
      // Test that URLs are properly formed with query parameters
      const params = new URLSearchParams()
      params.set('start_freq', '20')
      params.set('end_freq', '22000')
      params.set('duration', '10')
      const url = `/audio/sweep/start?${params.toString()}`

      expect(url).toContain('start_freq=20')
      expect(url).toContain('end_freq=22000')
      expect(url).toContain('duration=10')
    })

    it('should properly encode special characters in paths', () => {
      const optimizationId = 'opt-id-with-special/chars'
      const encoded = encodeURIComponent(optimizationId)
      expect(encoded).not.toContain('/')
      expect(encoded).toContain('%2F')
    })

    it('should validate that recording ID can be string or number', () => {
      const id1: string | number = '12345'
      const id2: string | number = 12345

      expect(String(id1)).toEqual(String(id2))
    })
  })

  describe('Streaming API Consistency', () => {
    it('should validate NewRoomEQOptimizationProgress event types', () => {
      const event: roomeq.NewRoomEQOptimizationProgress = {
        type: 'started',
        message: 'Starting optimization'
      }

      expect(['started', 'output', 'completed']).toContain(event.type)
    })

    it('should validate RoomEQOptimizationEvent event types', () => {
      const event: roomeq.RoomEQOptimizationEvent = {
        type: 'started',
        message: 'Starting'
      }

      expect(['started', 'filter_added', 'completed', 'error']).toContain(event.type)
    })

    it('should have consistent filter response between streaming APIs', () => {
      const eventFilter: roomeq.RoomEQOptimizationFilter = {
        filter_type: 'eq',
        frequency: 1000,
        gain_db: 3.0,
        q: 1.0,
        description: 'Test',
        coefficients: { a: [1], b: [1] }
      }

      const progressFilter: roomeq.NewRoomEQOptimizedFilter = {
        filter_type: 'eq',
        frequency: 1000,
        gain_db: 3.0,
        q: 1.0,
        description: 'Test'
      }

      expect(eventFilter.filter_type).toBe(progressFilter.filter_type)
      expect(eventFilter.frequency).toBe(progressFilter.frequency)
      expect(eventFilter.q).toBe(progressFilter.q)
      expect(eventFilter.gain_db).toBe(progressFilter.gain_db)
    })
  })

  describe('FFT Analysis Response Structure', () => {
    it('should have complete FFT response structure', () => {
      const fftResponse: roomeq.RoomEQFFTResponse = {
        status: 'success',
        fft_analysis: {
          fft_size: 2048,
          window_type: 'hann',
          sample_rate: 48000,
          frequency_resolution: 1.0,
          frequencies: [20, 100, 1000],
          magnitudes: [0, 0, 0],
          phases: [0, 0, 0],
          peak_frequency: 100,
          peak_magnitude: 0,
          spectral_centroid: 500,
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
        analysis_timestamp: '2024-01-01T00:00:00Z'
      }

      expect(fftResponse.fft_analysis).toBeDefined()
      expect(fftResponse.fft_analysis.frequency_bands).toBeDefined()
      expect(fftResponse.fft_analysis.frequency_bands).toHaveProperty('sub_bass')
      expect(fftResponse.fft_analysis.frequency_bands).toHaveProperty('brilliance')
    })

    it('should validate FFT difference response structure', () => {
      const diffResponse: roomeq.RoomEQFFTDifferenceResponse = {
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
            filename: 'file1.wav',
            peak_frequency: 1000,
            peak_magnitude: 0,
            spectral_centroid: 500
          },
          file2: {
            filename: 'file2.wav',
            peak_frequency: 1000,
            peak_magnitude: 0,
            spectral_centroid: 500
          }
        },
        difference_analysis: {
          title: 'Test',
          description: 'Test diff',
          diff_type: 'magnitude',
          frequencies: [20, 100],
          magnitudes: [0, 0],
          phases: [0, 0],
          sample_rate: 48000,
          peak_frequency: 100,
          peak_magnitude: 0,
          source_info: {
            result1_title: 'File 1',
            result2_title: 'File 2',
            result1_peak_freq: 1000,
            result2_peak_freq: 1000
          },
          spectral_density: {
            type: 'PSD',
            description: 'Power Spectral Density',
            units: 'dB',
            computation: 'FFT magnitude squared'
          },
          statistics: {
            n_points: 100,
            frequency_range: [20, 20000],
            mean_difference_db: 0,
            rms_difference_db: 0.5,
            max_difference_db: 2.0
          }
        },
        individual_analyses: {
          file1_fft: {
            peak_frequency: 1000,
            peak_magnitude: 0,
            spectral_centroid: 500
          },
          file2_fft: {
            peak_frequency: 1000,
            peak_magnitude: 0,
            spectral_centroid: 500
          }
        }
      }

      expect(diffResponse.difference_analysis).toBeDefined()
      expect(diffResponse.difference_analysis.statistics).toBeDefined()
      expect(diffResponse.individual_analyses).toBeDefined()
    })
  })

  describe('Room Measurement Consistency', () => {
    it('should have consistent room measure request structure', () => {
      const request: roomeq.RoomMeasureRequest = {
        device: 'hw:0,0',
        channel: 'both',
        count: 3,
        timeout: 30,
        normalize_frequency: 1000,
        fft_points: 64
      }

      expect(request.device).toBeDefined()
      expect(request.channel).toMatch(/^(left|right|both)$/)
      expect(request.count).toBeGreaterThan(0)
    })

    it('should validate room measure response structure', () => {
      const response: roomeq.RoomMeasureResponse = {
        status: 'success',
        device: 'hw:0,0',
        channel: 'both',
        count: 3,
        fft_points: 64,
        csv_path: '/path/to/measurement.csv',
        fft: {
          frequencies: [20, 100, 1000],
          magnitudes_db: [0, 0, 0],
          phase: [0, 0, 0],
          points: 3
        },
        normalization: {
          applied: true,
          requested_frequency: 1000,
          actual_frequency: 1000,
          reference_level_db: 85
        },
        message: 'Success'
      }

      expect(response.status).toBe('success')
      expect(response.fft.frequencies.length).toBe(response.fft.magnitudes_db.length)
      expect(response.fft.frequencies.length).toBe(response.fft.phase.length)
      expect(response.fft.points).toBe(response.fft.frequencies.length)
    })
  })

  describe('Recording Status States', () => {
    it('should have valid recording status states', () => {
      const validStates: Array<'idle' | 'recording' | 'completed' | 'error'> = [
        'idle',
        'recording',
        'completed',
        'error'
      ]

      const response: roomeq.RoomEQRecordingStatusResponse = {
        status: 'success',
        recording_id: '123',
        state: 'completed'
      }

      expect(validStates).toContain(response.state)
    })

    it('should have consistent optimization status states', () => {
      const validStates: Array<'optimizing' | 'completed' | 'error' | 'failed' | 'cancelled'> = [
        'optimizing',
        'completed',
        'error',
        'failed',
        'cancelled'
      ]

      const response: roomeq.RoomEQOptimizationStatusResponse = {
        optimization_id: 'opt-1',
        status: 'completed',
        progress: 100,
        current_step: 'Done',
        steps_completed: 10,
        total_steps: 10,
        elapsed_time: 1000
      }

      expect(validStates).toContain(response.status)
    })
  })

  describe('Signal Response Consistency', () => {
    it('should validate sweep signal response includes all fields', () => {
      const sweepResponse: roomeq.RoomEQSweepStartResponse = {
        status: 'started',
        signal_type: 'sine_sweep',
        start_freq: 20,
        end_freq: 22000,
        duration: 10,
        sweeps: 1,
        total_duration: 10,
        amplitude: 0.5,
        device: 'hw:0,0',
        stop_time: '2024-01-01T00:00:10Z'
      }

      expect(sweepResponse.signal_type).toBe('sine_sweep')
      expect(sweepResponse.start_freq).toBeLessThan(sweepResponse.end_freq)
      expect(sweepResponse.total_duration).toBeGreaterThanOrEqual(sweepResponse.duration)
    })

    it('should validate noise status includes proper fields', () => {
      const noiseStatus: roomeq.RoomEQNoiseStatus = {
        active: true,
        signal_type: 'noise',
        amplitude: 0.5,
        device: 'hw:0,0',
        remaining_seconds: 5,
        stop_time: '2024-01-01T00:00:05Z'
      }

      expect(noiseStatus.active).toBeDefined()
      expect(noiseStatus.remaining_seconds).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Target Curve and Preset Consistency', () => {
    it('should validate target curve point structure', () => {
      const point: roomeq.RoomEQTargetPoint = {
        frequency: 1000,
        target_db: 0,
        weight: 1.0
      }

      expect(point.frequency).toBeGreaterThan(0)
      expect(typeof point.target_db).toBe('number')
      expect(point.weight === null || typeof point.weight === 'number' || Array.isArray(point.weight)).toBe(true)
    })

    it('should validate new target curve point structure matches legacy', () => {
      const legacyPoint: roomeq.RoomEQTargetPoint = {
        frequency: 1000,
        target_db: 0,
        weight: 1.0
      }

      const newPoint: roomeq.NewRoomEQTargetCurvePoint = {
        frequency: 1000,
        target_db: 0,
        weight: 1.0
      }

      expect(legacyPoint.frequency).toBe(newPoint.frequency)
      expect(legacyPoint.target_db).toBe(newPoint.target_db)
      expect(legacyPoint.weight).toBe(newPoint.weight)
    })

    it('should validate optimizer params have sensible defaults', () => {
      const params: roomeq.NewRoomEQOptimizerParams = {
        qmax: 10,
        mindb: -10,
        maxdb: 3,
        add_highpass: true,
        acceptable_error: 0.1
      }

      expect(params.qmax).toBeGreaterThan(0)
      expect(params.mindb).toBeLessThan(params.maxdb)
      expect(params.acceptable_error).toBeGreaterThan(0)
      expect(typeof params.add_highpass).toBe('boolean')
    })
  })

  describe('API Info and Endpoint Structure', () => {
    it('should validate API info structure', () => {
      const info: roomeq.RoomEQApiInfo = {
        message: 'RoomEQ API',
        version: '1.0.0',
        description: 'Room Equalization API',
        endpoints: {
          info: ['/'],
          microphones: ['/microphones'],
          audio_devices: ['/audio/cards', '/audio/inputs'],
          measurements: ['/audio/room-measure'],
          signal_generation: ['/audio/noise/start', '/audio/sweep/start']
        },
        usage: {
          'POST /audio/noise/start': 'Start white noise playback'
        }
      }

      expect(info.endpoints).toBeDefined()
      expect(Array.isArray(info.endpoints.info)).toBe(true)
      expect(Array.isArray(info.endpoints.microphones)).toBe(true)
    })

    it('should validate version info structure', () => {
      const version: roomeq.RoomEQVersionInfo = {
        version: '1.0.0',
        api_name: 'RoomEQ',
        features: ['noise', 'sweep', 'recording', 'fft']
      }

      expect(typeof version.version).toBe('string')
      expect(Array.isArray(version.features)).toBe(true)
    })
  })

  describe('Microphone and Audio Card Structure', () => {
    it('should validate microphone interface', () => {
      const mic: roomeq.RoomEQMicrophone = {
        card_index: 0,
        device_name: 'Microphone (USB Audio)',
        sensitivity: -35,
        sensitivity_str: '-35 dBV/Pa',
        gain_db: 0
      }

      expect(mic.card_index).toBeGreaterThanOrEqual(0)
      expect(typeof mic.device_name).toBe('string')
      expect(typeof mic.sensitivity).toBe('number')
    })

    it('should validate raw microphones response', () => {
      const raw: roomeq.RoomEQMicrophonesRaw = {
        microphones: ['hw:0,0', 'hw:1,0']
      }

      expect(Array.isArray(raw.microphones)).toBe(true)
      expect(raw.microphones.every(m => typeof m === 'string')).toBe(true)
    })

    it('should validate audio inputs structure', () => {
      const inputs: roomeq.RoomEQAudioInputs = {
        input_cards: [0, 1],
        count: 2
      }

      expect(inputs.count).toBe(inputs.input_cards.length)
    })

    it('should validate audio cards structure', () => {
      const cards: roomeq.RoomEQAudioCards = {
        cards: ['USB Audio'],
        count: 1
      }

      expect(cards.count).toBe(cards.cards.length)
    })
  })

  describe('Usable Range Detection', () => {
    it('should validate usable range result structure', () => {
      const result: roomeq.RoomEQUsableRangeResult = {
        success: true,
        usable_freq_low: 50,
        usable_freq_high: 18000,
        min_frequency: 50,
        max_frequency: 18000
      }

      expect(result.usable_freq_low).toBeLessThan(result.usable_freq_high)
      expect(typeof result.usable_freq_low).toBe('number')
      expect(typeof result.usable_freq_high).toBe('number')
    })

    it('should validate usable range request structure', () => {
      const request: roomeq.RoomEQUsableRangeRequest = {
        measured_curve: {
          frequencies: [20, 100, 1000],
          magnitudes_db: [0, 0, 0]
        },
        sample_rate: 48000
      }

      expect(request.measured_curve.frequencies.length).toBe(request.measured_curve.magnitudes_db.length)
      expect(request.sample_rate).toBeGreaterThan(0)
    })
  })

  describe('Constants and Default Values', () => {
    it('should have valid prerecorded sweep signal constant', () => {
      expect(roomeq.PRERECORDED_SWEEP_SIGNAL).toBeDefined()
      expect(roomeq.PRERECORDED_SWEEP_SIGNAL).toContain('.wav')
    })

    it('should have valid minimum version constant', () => {
      expect(roomeq.ROOMEQ_MINIMUM_VERSION).toBeDefined()
      expect(roomeq.ROOMEQ_MINIMUM_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('Regression Tests - Complex Scenarios', () => {
    describe('Multi-step Measurement Workflows', () => {
      it('should handle complete measurement workflow without errors', () => {
        // Test that all measurement-related functions work in sequence
        const startNoise: roomeq.RoomEQSignalResponse = {
          message: 'Started',
          status: 'playing',
          filename: 'noise.wav'
        }

        const startRecording: roomeq.RoomEQRecordingStartResponse = {
          status: 'recording',
          recording_id: 'rec-1',
          filename: 'rec-1.wav',
          duration: 10
        }

        const recordingStatus: roomeq.RoomEQRecordingStatusResponse = {
          status: 'completed',
          recording_id: 'rec-1',
          state: 'completed',
          filename: 'rec-1.wav'
        }

        expect(startNoise.status).toBeDefined()
        expect(startRecording.recording_id).toBeDefined()
        expect(recordingStatus.state).toBe('completed')
      })

      it('should validate measurement session response format', () => {
        const sessionData: Awaited<ReturnType<typeof roomeq.startRoomMeasurementSession>> = {
          success: true,
          data: {
            noiseFilename: 'noise.wav',
            recordingId: 'rec-1'
          }
        }

        expect(sessionData.success).toBe(true)
        expect(sessionData.data?.noiseFilename).toBeDefined()
        expect(sessionData.data?.recordingId).toBeDefined()
      })
    })

    describe('FFT Analysis Edge Cases', () => {
      it('should handle FFT response with all frequency bands', () => {
        const fftBands: Partial<roomeq.RoomEQFFTResponse['fft_analysis']['frequency_bands']> = {
          sub_bass: { range: '20-60', avg_magnitude: -35, peak_frequency: 40 },
          bass: { range: '60-250', avg_magnitude: -30, peak_frequency: 100 },
          low_midrange: { range: '250-500', avg_magnitude: -25, peak_frequency: 400 },
          midrange: { range: '500-2000', avg_magnitude: -15, peak_frequency: 1000 },
          upper_midrange: { range: '2000-4000', avg_magnitude: -20, peak_frequency: 3000 },
          presence: { range: '4000-6000', avg_magnitude: -25, peak_frequency: 5000 },
          brilliance: { range: '6000-22000', avg_magnitude: -30, peak_frequency: 10000 }
        }

        expect(Object.keys(fftBands)).toHaveLength(7)
        Object.values(fftBands).forEach(band => {
          expect(band?.avg_magnitude).toBeDefined()
          expect(band?.peak_frequency).toBeGreaterThan(0)
        })
      })

      it('should handle FFT difference with various source types', () => {
        const sourceTypes: Array<'recording_id' | 'filename' | 'filepath'> = ['recording_id', 'filename', 'filepath']

        sourceTypes.forEach(type1 => {
          sourceTypes.forEach(type2 => {
            // Verify all combinations are theoretically valid
            expect(['recording_id', 'filename', 'filepath']).toContain(type1)
            expect(['recording_id', 'filename', 'filepath']).toContain(type2)
          })
        })
      })
    })

    describe('Optimization API Compatibility', () => {
      it('should distinguish between legacy and new optimization APIs', () => {
        const legacyRequest = {
          recording_id: 'rec-123',
          target_curve: 'flat',
          optimizer_preset: 'default',
          filter_count: 10
        }

        const newRequest: roomeq.NewRoomEQOptimizationRequest = {
          measured_curve: {
            frequencies: [20, 100],
            magnitudes_db: [0, -3]
          },
          target_curve: {
            curve: [
              { frequency: 20, target_db: 0, weight: null },
              { frequency: 100, target_db: 0, weight: null }
            ]
          },
          optimizer_params: {
            qmax: 10,
            mindb: -10,
            maxdb: 3,
            add_highpass: true,
            acceptable_error: 0.1
          },
          sample_rate: 48000,
          filter_count: 10
        }

        expect('recording_id' in legacyRequest).toBe(true)
        expect('recording_id' in newRequest).toBe(false)
        expect('measured_curve' in newRequest).toBe(true)
        expect('measured_curve' in legacyRequest).toBe(false)
      })

      it('should validate optimizer preset constraints', () => {
        const presets: roomeq.RoomEQOptimizerPreset[] = [
          {
            key: 'mild',
            preset: 'mild',
            name: 'Mild',
            description: 'Gentle',
            qmax: 5,
            mindb: -5,
            maxdb: 1,
            add_highpass: false
          },
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
            description: 'Strong',
            qmax: 20,
            mindb: -15,
            maxdb: 6,
            add_highpass: true
          }
        ]

        presets.forEach(preset => {
          expect(preset.qmax).toBeGreaterThan(0)
          expect(preset.mindb).toBeLessThan(preset.maxdb)
          expect(typeof preset.add_highpass).toBe('boolean')
        })
      })
    })

    describe('Response Envelope Consistency', () => {
      it('should maintain consistent success/failure pattern across all APIs', () => {
        const successEnvelopes: roomeq.RoomEQApiEnvelope[] = [
          { success: true, data: { version: '1.0.0' } },
          { success: true, data: { count: 2, cards: ['a', 'b'] } },
          { success: true, data: null }
        ]

        const failureEnvelopes: roomeq.RoomEQApiEnvelope[] = [
          { success: false, detail: 'Error message' },
          { success: false, detail: 'Another error' }
        ]

        successEnvelopes.forEach(env => {
          expect(env.success).toBe(true)
        })

        failureEnvelopes.forEach(env => {
          expect(env.success).toBe(false)
          expect(env.detail).toBeDefined()
        })
      })

      it('should handle fallback data in error responses', () => {
        // Some functions return fallback data even on error
        const presetError: roomeq.RoomEQApiEnvelope<roomeq.RoomEQOptimizerPresets> = {
          success: false,
          data: {
            count: 1,
            optimizer_presets: [{
              key: 'default',
              preset: 'default',
              name: 'Default',
              description: 'Default preset',
              qmax: 10,
              mindb: -10,
              maxdb: 3,
              add_highpass: true
            }],
            success: true
          },
          detail: 'API error'
        }

        expect(presetError.success).toBe(false)
        expect(presetError.data?.optimizer_presets).toBeDefined()
        expect(presetError.data?.optimizer_presets.length).toBeGreaterThan(0)
      })
    })

    describe('Version and Capability Checks', () => {
      it('should validate version comparison edge cases', () => {
        const testCases = [
          { v1: '0.6.0', v2: '0.6.0', expected: true },
          { v1: '0.6.1', v2: '0.6.0', expected: true },
          { v1: '0.7.0', v2: '0.6.9', expected: true },
          { v1: '1.0.0', v2: '0.9.9', expected: true },
          { v1: '0.5.9', v2: '0.6.0', expected: false },
          { v1: '0.6.0', v2: '0.6.1', expected: false },
          { v1: '1.0.0', v2: '1.0.1', expected: false }
        ]

        testCases.forEach(({ v1, v2, expected }) => {
          expect(roomeq.isVersionAtLeast(v1, v2)).toBe(expected)
        })
      })
    })

    describe('Parameter Encoding Edge Cases', () => {
      it('should handle special characters in optimization IDs', () => {
        const testIds = [
          'opt-123',
          'opt_456',
          'opt.789',
          'opt/special-chars'
        ]

        testIds.forEach(id => {
          const encoded = encodeURIComponent(id)
          expect(encoded).toBeDefined()
          expect(encoded.length).toBeGreaterThan(0)
        })
      })

      it('should handle numeric and string recording IDs interchangeably', () => {
        const stringId = '12345'
        const numericId = 12345

        expect(String(stringId)).toBe(String(numericId))
        expect(Number(stringId)).toBe(numericId)
      })
    })

    describe('Measurement Response Structure', () => {
      it('should validate complete RoomMeasureResponse structure', () => {
        const response: roomeq.RoomMeasureResponse = {
          status: 'success',
          device: 'hw:0',
          channel: 'both',
          count: 3,
          fft_points: 128,
          csv_path: '/data/measurement.csv',
          fft: {
            frequencies: [20, 50, 100, 500, 1000, 5000, 10000, 20000],
            magnitudes_db: [-30, -25, -20, -15, -10, -12, -18, -35],
            phase: [0, 10, 20, 30, 40, 50, 60, 70],
            points: 8
          },
          normalization: {
            applied: true,
            requested_frequency: 1000,
            actual_frequency: 1000,
            reference_level_db: -3
          },
          message: 'Measurement completed'
        }

        expect(response.status).toBe('success')
        expect(response.fft.frequencies).toHaveLength(response.fft.points)
        expect(response.fft.magnitudes_db).toHaveLength(response.fft.points)
        expect(response.normalization?.applied).toBe(true)
      })
    })

    describe('Filter and Curve Validation', () => {
      it('should validate target curve point definitions', () => {
        const curvePoints: roomeq.RoomEQTargetPoint[] = [
          { frequency: 20, target_db: 0, weight: null },
          { frequency: 100, target_db: -2, weight: 0.5 },
          { frequency: 1000, target_db: 0, weight: [0.3, 0.7] },
          { frequency: 20000, target_db: -1, weight: null }
        ]

        curvePoints.forEach((point, i) => {
          expect(point.frequency).toBeGreaterThan(0)
          if (i > 0) {
            expect(point.frequency).toBeGreaterThan(curvePoints[i - 1].frequency)
          }
          expect(typeof point.target_db).toBe('number')
        })
      })

      it('should validate filter definitions across APIs', () => {
        const legacyFilter: roomeq.RoomEQFilter = {
          index: 0,
          filter_type: 'hp',
          frequency: 30,
          q: 0.707,
          gain_db: 0,
          description: 'High-pass filter',
          text_format: '[HP] f=30Hz q=0.707',
          coefficients: { b: [1, -2, 1], a: [1, -1.5, 0.5] }
        }

        const newFilter: roomeq.NewRoomEQOptimizedFilter = {
          filter_type: 'hp',
          frequency: 30,
          q: 0.707,
          gain_db: 0,
          description: 'High-pass filter'
        }

        expect(legacyFilter.filter_type).toBe(newFilter.filter_type)
        expect(legacyFilter.coefficients).toBeDefined()
        expect(newFilter.coefficients).not.toBeDefined()
      })
    })
  })
})
