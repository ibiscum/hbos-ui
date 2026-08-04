import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import RoomMeasurementWizard from '@/components/RoomMeasurementWizard.vue'
import type { RoomEQApiEnvelope, RoomEQMicrophone, RoomMeasureResponse } from '@/api/roomeq'

const roomeqMocks = vi.hoisted(() => ({
  measureRoomEQSPL: vi.fn(),
  getRoomEQMicrophones: vi.fn(),
  startRoomEQNoise: vi.fn(),
  stopRoomEQNoise: vi.fn(),
  keepRoomEQNoisePlaying: vi.fn(),
  completeRoomMeasurement: vi.fn(),
  startRoomMeasure: vi.fn(),
  analyzeRoomEQFFTRecording: vi.fn(),
}))

const playerApiMocks = vi.hoisted(() => ({
  pauseAllPlayers: vi.fn(),
}))

const storeState = vi.hoisted(() => ({
  currentVolume: null as { value: number } | null,
  getExpertMode: null as { value: boolean } | null,
  setVolume: vi.fn(),
  saveRoomMeasurement: vi.fn(),
}))

vi.mock('@/api/roomeq', () => ({
  measureRoomEQSPL: roomeqMocks.measureRoomEQSPL,
  getRoomEQMicrophones: roomeqMocks.getRoomEQMicrophones,
  startRoomEQNoise: roomeqMocks.startRoomEQNoise,
  stopRoomEQNoise: roomeqMocks.stopRoomEQNoise,
  keepRoomEQNoisePlaying: roomeqMocks.keepRoomEQNoisePlaying,
  completeRoomMeasurement: roomeqMocks.completeRoomMeasurement,
  startRoomMeasure: roomeqMocks.startRoomMeasure,
  analyzeRoomEQFFTRecording: roomeqMocks.analyzeRoomEQFFTRecording,
}))

vi.mock('@/api/player', () => ({
  pauseAllPlayers: playerApiMocks.pauseAllPlayers,
}))

vi.mock('@/stores/player', async () => {
  const { ref } = await import('vue')

  if (!storeState.currentVolume) {
    storeState.currentVolume = ref(36)
  }

  return {
    usePlayerStore: () => ({
      currentVolume: storeState.currentVolume,
      setVolume: storeState.setVolume,
    }),
  }
})

vi.mock('@/stores/settings', async () => {
  const { ref } = await import('vue')

  if (!storeState.getExpertMode) {
    storeState.getExpertMode = ref(true)
  }

  return {
    useSettingsStore: () => ({
      getExpertMode: storeState.getExpertMode,
      saveRoomMeasurement: storeState.saveRoomMeasurement,
    }),
  }
})

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => store,
  }
})

const WizardModalStub = defineComponent({
  props: {
    currentStep: { type: Number, required: true },
    totalSteps: { type: Number, required: true },
    canProceedNext: { type: Boolean, default: true },
  },
  emits: ['close', 'next', 'previous', 'finish'],
  template: `
    <div data-test="wizard-modal">
      <div data-test="current-step">{{ currentStep }}</div>
      <button data-test="previous" @click="$emit('previous')">Previous</button>
      <button data-test="next" :disabled="!canProceedNext" @click="$emit('next')">Next</button>
      <button data-test="finish" @click="$emit('finish')">Finish</button>
      <slot />
    </div>
  `,
})

const microphones: RoomEQMicrophone[] = [
  {
    card_index: 1,
    device_name: 'MiniDSP UMIK-1',
    sensitivity: -26,
    sensitivity_str: '-26.0',
    gain_db: 18,
  },
  {
    card_index: 2,
    device_name: 'USB Mic 2',
    sensitivity: -28,
    sensitivity_str: '-28.0',
    gain_db: 20,
  },
]

const measureResponse: RoomEQApiEnvelope<RoomMeasureResponse> = {
  success: true,
  data: {
    status: 'success',
    device: 'hw:2,0',
    channel: 'right',
    count: 4,
    fft_points: 256,
    csv_path: '/tmp/measurement.csv',
    fft: {
      frequencies: [20, 100, 1000, 10000],
      magnitudes_db: [-4, -1, 0.5, -1.5],
      phase: [0, 0.1, 0.2, 0.3],
      points: 4,
    },
    normalization: {
      applied: true,
      requested_frequency: 1000,
      actual_frequency: 1000,
      reference_level_db: -0.2,
    },
    message: 'Measurement complete',
  },
}

function mountWizard() {
  return mount(RoomMeasurementWizard, {
    props: {
      isOpen: true,
    },
    global: {
      stubs: {
        WizardModal: WizardModalStub,
        Icon: { template: '<i />' },
        ProgressSlider: { template: '<div data-test="slider" />' },
        FrequencyResponseChart: { template: '<div data-test="chart" />' },
      },
    },
  })
}

async function goToStep(wrapper: ReturnType<typeof mountWizard>, step: number) {
  while (Number(wrapper.get('[data-test="current-step"]').text()) < step) {
    await wrapper.get('[data-test="next"]').trigger('click')
    await flushPromises()
  }
}

describe('RoomMeasurementWizard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    storeState.currentVolume!.value = 36
    storeState.getExpertMode!.value = true
    storeState.setVolume.mockResolvedValue(undefined)
    storeState.saveRoomMeasurement.mockResolvedValue(123)

    roomeqMocks.getRoomEQMicrophones.mockResolvedValue({ success: true, data: microphones })
    roomeqMocks.measureRoomEQSPL.mockResolvedValue({ success: true, data: { spl_db: 72.4 } })
    roomeqMocks.startRoomEQNoise.mockResolvedValue({ success: true })
    roomeqMocks.stopRoomEQNoise.mockResolvedValue({ success: true })
    roomeqMocks.keepRoomEQNoisePlaying.mockResolvedValue({ success: true })
    roomeqMocks.startRoomMeasure.mockResolvedValue(measureResponse)

    playerApiMocks.pauseAllPlayers.mockResolvedValue(undefined)
  })

  it('loads microphones on open and keeps next disabled until a selection is made', async () => {
    const wrapper = mountWizard()
    await flushPromises()

    expect(roomeqMocks.getRoomEQMicrophones).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.microphone-item')).toHaveLength(2)
    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeDefined()

    await wrapper.findAll('.microphone-item')[1].trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeUndefined()
  })

  it('pauses players when entering step 3 from step 2', async () => {
    roomeqMocks.getRoomEQMicrophones.mockResolvedValueOnce({ success: true, data: [microphones[0]] })

    const wrapper = mountWizard()
    await flushPromises()

    await wrapper.get('[data-test="next"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="next"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="current-step"]').text()).toBe('3')
    expect(playerApiMocks.pauseAllPlayers).toHaveBeenCalledTimes(1)
  })

  it('sends selected step-4 options to room-measure API and advances to step 5', async () => {
    const wrapper = mountWizard()
    await flushPromises()

    await wrapper.findAll('.microphone-item')[1].trigger('click')
    await flushPromises()

    await goToStep(wrapper, 4)

    const channelButtons = wrapper.findAll('.setting-row .segmented-btn')
    await channelButtons[1].trigger('click')
    await channelButtons[5].trigger('click')
    await channelButtons[8].trigger('click')
    await flushPromises()

    await wrapper.get('.measure-actions .nav-button').trigger('click')
    await flushPromises()

    expect(roomeqMocks.startRoomMeasure).toHaveBeenCalledTimes(1)
    expect(roomeqMocks.startRoomMeasure).toHaveBeenCalledWith({
      device: 'hw:2,0',
      channel: 'right',
      count: 4,
      normalize_frequency: 1000,
      fft_points: 256,
    })
    expect(wrapper.get('[data-test="current-step"]').text()).toBe('5')
  })

  it('allows returning to step 4 after measurement and proceeding forward again', async () => {
    const wrapper = mountWizard()
    await flushPromises()

    await wrapper.findAll('.microphone-item')[0].trigger('click')
    await goToStep(wrapper, 4)

    await wrapper.get('.measure-actions .nav-button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="current-step"]').text()).toBe('5')

    await wrapper.get('[data-test="previous"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="current-step"]').text()).toBe('4')
    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeUndefined()
  })

  it('saves measured data and emits completion on finish', async () => {
    const wrapper = mountWizard()
    await flushPromises()

    await wrapper.findAll('.microphone-item')[0].trigger('click')
    await goToStep(wrapper, 4)

    await wrapper.get('.measure-actions .nav-button').trigger('click')
    await flushPromises()

    const nameInput = wrapper.get('#measurementName')
    await nameInput.setValue(' Living Room 2026 ')

    await wrapper.get('[data-test="finish"]').trigger('click')
    await flushPromises()

    expect(storeState.saveRoomMeasurement).toHaveBeenCalledTimes(1)
    expect(storeState.saveRoomMeasurement).toHaveBeenCalledWith(
      'Living Room 2026',
      [20, 100, 1000, 10000],
      [-4, -1, 0.5, -1.5],
      44100,
      { frequency_type: 'fft' },
    )

    const emitted = wrapper.emitted('measurementCompleted')
    expect(emitted).toBeTruthy()
    expect(emitted).toHaveLength(1)
  })
})
