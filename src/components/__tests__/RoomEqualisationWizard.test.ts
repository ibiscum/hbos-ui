import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import RoomEqualisationWizard from '@/components/RoomEqualisationWizard.vue'
import type { RoomMeasurement } from '@/stores/settings'
import type { RoomEQApiEnvelope, RoomEQOptimizerPresets, RoomEQTargetPresets } from '@/api/roomeq'

vi.mock('@/api/config', () => ({
  setConfigValue: vi.fn(),
}))

vi.mock('@/api/roomeq', () => ({
  ROOMEQ_MINIMUM_VERSION: '0.6.0',
  getRoomEQTargetPresets: vi.fn(),
  detectUsableFrequencyRange: vi.fn(),
  startNewRoomEQOptimizationStream: vi.fn(),
  getRoomEQOptimizerPresets: vi.fn(),
  checkRoomEQVersionRequirement: vi.fn(),
}))

import {
  ROOMEQ_MINIMUM_VERSION,
  getRoomEQTargetPresets,
  detectUsableFrequencyRange,
  startNewRoomEQOptimizationStream,
  getRoomEQOptimizerPresets,
  checkRoomEQVersionRequirement,
} from '@/api/roomeq'

const WizardModalStub = defineComponent({
  props: {
    currentStep: { type: Number, required: true },
    nextLabel: { type: String, default: 'Next' },
    canProceedNext: { type: Boolean, default: true },
  },
  emits: ['close', 'next', 'previous', 'finish'],
  template: `
    <div data-test="wizard-modal">
      <div data-test="current-step">{{ currentStep }}</div>
      <div data-test="next-label">{{ nextLabel }}</div>
      <button data-test="close" @click="$emit('close')">Close</button>
      <button data-test="previous" @click="$emit('previous')">Previous</button>
      <button data-test="next" :disabled="!canProceedNext" @click="$emit('next')">Next</button>
      <button data-test="finish" @click="$emit('finish')">Finish</button>
      <slot />
    </div>
  `,
})

const measurement: RoomMeasurement = {
  id: 1,
  name: 'Living Room',
  timestamp: '2026-08-03T12:00:00.000Z',
  frequencies: [20, 100, 1000, 10000],
  magnitudes: [-3.2, -1.5, 0.2, -2.1],
  sample_rate: 48000,
  frequency_type: 'fft',
}

const targetPresetsResponse: RoomEQApiEnvelope<RoomEQTargetPresets> = {
  success: true,
  data: {
    count: 2,
    success: true,
    target_curves: [
      {
        key: 'harman',
        name: 'Harman',
        description: 'Harman house curve',
        expert: false,
        curve: [
          { frequency: 20, target_db: 2, weight: null },
          { frequency: 20000, target_db: -1, weight: null },
        ],
      },
      {
        key: 'flat',
        name: 'Flat',
        description: 'Flat reference',
        expert: false,
        curve: [
          { frequency: 20, target_db: 0, weight: null },
          { frequency: 20000, target_db: 0, weight: null },
        ],
      },
    ],
  },
}

const optimizerPresetsResponse: RoomEQApiEnvelope<RoomEQOptimizerPresets> = {
  success: true,
  data: {
    count: 2,
    success: true,
    optimizer_presets: [
      {
        key: 'default',
        preset: 'default',
        name: 'Default',
        description: 'Balanced defaults',
        qmax: 10,
        mindb: -10,
        maxdb: 3,
        add_highpass: false,
      },
      {
        key: 'aggressive',
        preset: 'aggressive',
        name: 'Aggressive',
        description: 'More correction',
        qmax: 18,
        mindb: -14,
        maxdb: 6,
        add_highpass: true,
      },
    ],
  },
}

const mountWizard = (props: Partial<{ isOpen: boolean; exportMode: boolean }> = {}) => {
  return mount(RoomEqualisationWizard, {
    props: {
      isOpen: true,
      exportMode: false,
      measurement,
      ...props,
    },
    global: {
      stubs: {
        WizardModal: WizardModalStub,
        FrequencyResponseChart: { template: '<div data-test="chart" />' },
        Icon: { template: '<i />' },
      },
    },
  })
}

const goToStep = async (wrapper: ReturnType<typeof mountWizard>, step: number) => {
  while (Number(wrapper.get('[data-test="current-step"]').text()) < step) {
    await wrapper.get('[data-test="next"]').trigger('click')
    await flushPromises()
  }
}

describe('RoomEqualisationWizard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(getRoomEQTargetPresets).mockResolvedValue(targetPresetsResponse)
    vi.mocked(getRoomEQOptimizerPresets).mockResolvedValue(optimizerPresetsResponse)
    vi.mocked(detectUsableFrequencyRange).mockResolvedValue({
      success: true,
      data: {
        success: true,
        usable_frequency_range: {
          low_hz: 40,
          high_hz: 18000,
          recommended_min: 40,
          recommended_max: 18000,
        },
      },
    })
    vi.mocked(checkRoomEQVersionRequirement).mockResolvedValue({ success: true, currentVersion: '0.9.0' })
    vi.mocked(startNewRoomEQOptimizationStream).mockImplementation(async (_payload, onEvent, _onError, onComplete) => {
      onEvent({ type: 'started', message: 'started' })
      onEvent({
        type: 'completed',
        message: 'completed',
        line: JSON.stringify({
          success: true,
          filters: [],
          final_error: 1.2,
          original_error: 2.4,
          improvement_db: 1.2,
          processing_time_ms: 50,
          error_message: null,
          usable_freq_low: 35,
          usable_freq_high: 17000,
        }),
      })
      onComplete()
      return { success: true }
    })
  })

  it('prefers flat target when available even if API order differs', async () => {
    const wrapper = mountWizard()
    await flushPromises()

    await goToStep(wrapper, 2)

    const activeTarget = wrapper.get('.segmented-btn.active')
    expect(activeTarget.text()).toBe('Flat')
  })

  it('parses nested usable range response and updates step 3 inputs', async () => {
    vi.mocked(detectUsableFrequencyRange).mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        usable_frequency_range: {
          low_hz: 55,
          high_hz: 16800,
          recommended_min: 35,
          recommended_max: 16800,
        },
      },
    })

    const wrapper = mountWizard()
    await flushPromises()

    await goToStep(wrapper, 3)
    await flushPromises()

    const freqInputs = wrapper.findAll('.usable-range-controls .number-input')
    const minInput = freqInputs[0].element as HTMLInputElement
    const maxInput = freqInputs[1].element as HTMLInputElement

    expect(minInput.value).toBe('35')
    expect(maxInput.value).toBe('16800')

    const lowpassCheckbox = wrapper.get('#add-lowpass').element as HTMLInputElement
    expect(lowpassCheckbox.checked).toBe(true)
  })

  it('shows API compatibility error when backend version is too old', async () => {
    vi.mocked(checkRoomEQVersionRequirement).mockResolvedValueOnce({
      success: false,
      error: `RoomEQ API version 0.5.0 is not supported. Minimum required version is ${ROOMEQ_MINIMUM_VERSION}`,
      currentVersion: '0.5.0',
    })

    const wrapper = mountWizard()
    await flushPromises()

    await goToStep(wrapper, 4)
    await flushPromises()

    expect(wrapper.text()).toContain('API Version Compatibility Issue')
    expect(wrapper.text()).toContain(ROOMEQ_MINIMUM_VERSION)
  })

  it('uses selected optimizer preset limits in optimization payload', async () => {
    const wrapper = mountWizard({ exportMode: true })
    await flushPromises()

    await goToStep(wrapper, 3)

    const presetSelect = wrapper.get('select.select-input')
    await presetSelect.setValue('aggressive')

    await wrapper.get('[data-test="next"]').trigger('click')
    await flushPromises()

    expect(startNewRoomEQOptimizationStream).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(startNewRoomEQOptimizationStream).mock.calls[0][0]

    expect(payload.optimizer_params.qmax).toBe(18)
    expect(payload.optimizer_params.mindb).toBe(-14)
    expect(payload.optimizer_params.maxdb).toBe(6)
  })

  it('resets optimizer preset back to default key after close', async () => {
    const wrapper = mountWizard({ exportMode: true })
    await flushPromises()

    await goToStep(wrapper, 3)
    await wrapper.get('select.select-input').setValue('aggressive')

    await wrapper.get('[data-test="close"]').trigger('click')
    await flushPromises()

    await goToStep(wrapper, 3)

    const presetSelect = wrapper.get('select.select-input').element as HTMLSelectElement
    expect(presetSelect.value).toBe('default')
  })
})
