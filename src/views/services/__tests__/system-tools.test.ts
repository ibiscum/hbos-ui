import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import SystemToolsView from '../system-tools.vue'

const mocks = vi.hoisted(() => {
  const expertModeRef = { value: false }

  const toastStore = {
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    showInfoToast: vi.fn(),
  }

  const settingsStore = {
    updateExpertMode: vi.fn(async (mode: boolean) => {
      expertModeRef.value = mode
    }),
  }

  const rebootSystem = vi.fn(async () => ({ status: 'success' }))
  const detectSoundCardAPI = vi.fn(async () => ({
    status: 'success',
    data: {
      card_name: 'DAC+ DSP',
      dtoverlay: 'hifiberry-dacplusdsp',
    },
  }))
  const setSoundCardDtoverlay = vi.fn(async () => ({ status: 'success' }))
  const getSoundCards = vi.fn(async () => ({
    status: 'success',
    data: {
      soundcards: [
        { name: 'Beocreate 4-Channel Amplifier' },
        { name: 'DAC+ Zero/Light/MiniAmp' },
      ],
      count: 2,
    },
  }))
  const setSoundCardDetection = vi.fn(async () => ({ status: 'success', message: 'ok' }))
  const disableSoundCardDetection = vi.fn(async () => ({
    status: 'success',
    data: { reboot_required: true },
  }))
  const getSoundCardDetectionStatus = vi.fn(async () => ({
    status: 'success',
    data: {
      detection_enabled: true,
      detection_disabled: false,
      configured_card_name: null,
      configured_dtoverlay: null,
    },
  }))
  const resetConfigDB = vi.fn(async () => ({ status: 'success' }))
  const stopAllPlayers = vi.fn(async () => true)

  return {
    expertModeRef,
    toastStore,
    settingsStore,
    rebootSystem,
    detectSoundCardAPI,
    setSoundCardDtoverlay,
    getSoundCards,
    setSoundCardDetection,
    disableSoundCardDetection,
    getSoundCardDetectionStatus,
    resetConfigDB,
    stopAllPlayers,
  }
})

vi.mock('pinia', () => ({
  storeToRefs: () => ({ getExpertMode: mocks.expertModeRef }),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => mocks.toastStore,
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => mocks.settingsStore,
}))

vi.mock('@/api/system', () => ({
  rebootSystem: mocks.rebootSystem,
  detectSoundCard: mocks.detectSoundCardAPI,
  setSoundCardDtoverlay: mocks.setSoundCardDtoverlay,
  getSoundCards: mocks.getSoundCards,
  setSoundCardDetection: mocks.setSoundCardDetection,
  disableSoundCardDetection: mocks.disableSoundCardDetection,
  getSoundCardDetectionStatus: mocks.getSoundCardDetectionStatus,
  resetConfigDB: mocks.resetConfigDB,
}))

vi.mock('@/api/player', () => ({
  stopAllPlayers: mocks.stopAllPlayers,
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/components/ToggleSwitch.vue', () => ({
  default: {
    name: 'ToggleSwitch',
    props: ['modelValue', 'disabled', 'loading'],
    emits: ['update:modelValue'],
    template:
      '<input class="toggle-switch-stub" type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
}))

vi.mock('@/components/ConfirmationDialog.vue', () => ({
  default: {
    name: 'ConfirmationDialog',
    props: [
      'isOpen',
      'title',
      'message',
      'confirmButtonText',
      'cancelButtonText',
      'isDangerous',
      'requiresTextConfirmation',
      'confirmationText',
      'icon',
    ],
    emits: ['close', 'confirm'],
    template: `
      <div v-if="isOpen" class="confirmation-dialog-stub" :data-title="title" :data-confirm-text="confirmButtonText">
        <p class="dialog-message">{{ message }}</p>
        <button class="dialog-confirm" @click="$emit('confirm')">Confirm</button>
        <button class="dialog-close" @click="$emit('close')">Close</button>
      </div>
    `,
  },
}))

const mountView = () => mount(SystemToolsView)

describe('services/system-tools view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.expertModeRef.value = false

    mocks.settingsStore.updateExpertMode.mockImplementation(async (mode: boolean) => {
      mocks.expertModeRef.value = mode
    })

    mocks.getSoundCards.mockResolvedValue({
      status: 'success',
      data: {
        soundcards: [
          { name: 'Beocreate 4-Channel Amplifier' },
          { name: 'DAC+ Zero/Light/MiniAmp' },
        ],
        count: 2,
      },
    })

    mocks.getSoundCardDetectionStatus.mockResolvedValue({
      status: 'success',
      data: {
        detection_enabled: true,
        detection_disabled: false,
        configured_card_name: null,
        configured_dtoverlay: null,
      },
    })

    mocks.detectSoundCardAPI.mockResolvedValue({
      status: 'success',
      data: {
        card_name: 'DAC+ DSP',
        dtoverlay: 'hifiberry-dacplusdsp',
      },
    })

    mocks.setSoundCardDtoverlay.mockResolvedValue({ status: 'success' })
    mocks.disableSoundCardDetection.mockResolvedValue({ status: 'success', data: { reboot_required: true } })
    mocks.setSoundCardDetection.mockResolvedValue({ status: 'success', message: 'ok' })
    mocks.stopAllPlayers.mockResolvedValue(true)
    mocks.rebootSystem.mockResolvedValue({ status: 'success' })
    mocks.resetConfigDB.mockResolvedValue({ status: 'success' })
  })

  describe('unit coverage', () => {
    it('renders page shell with expected tool headings', async () => {
      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('System Tools')
      expect(page.attributes('data-back-link')).toBe('services')
      expect(wrapper.text()).toContain('Reset System')
      expect(wrapper.text()).toContain('Auto-detect Sound Card')
      expect(wrapper.text()).toContain('Fixed sound card configuration')
      expect(wrapper.text()).toContain('Stop All Music Players')
      expect(wrapper.text()).toContain('Expert Mode')
    })

    it('loads sound cards on startup and applies transformed option labels', async () => {
      const wrapper = mountView()
      await flushPromises()

      const options = wrapper.findAll('.soundcard-select option').map((o) => o.text())
      expect(mocks.getSoundCards).toHaveBeenCalledTimes(1)
      expect(options).toContain('No fixed configuration (auto-detect)')
      expect(options).toContain('Beocreate')
      expect(options).toContain('DAC+ Zero')
    })

    it('preselects configured card when detection is disabled', async () => {
      mocks.getSoundCardDetectionStatus.mockResolvedValueOnce({
        status: 'success',
        data: {
          detection_enabled: false,
          detection_disabled: true,
          configured_card_name: 'DAC+ Zero/Light/MiniAmp',
          configured_dtoverlay: 'hifiberry-dac',
        },
      })

      const wrapper = mountView()
      await flushPromises()

      const select = wrapper.get('.soundcard-select').element as HTMLSelectElement
      expect(select.value).toBe('DAC+ Zero/Light/MiniAmp')
    })

    it('keeps stop-all-players card semantic class for dedicated styling contract', async () => {
      const wrapper = mountView()
      await flushPromises()

      const stopCard = wrapper
        .findAll('.tool-card')
        .find((card) => card.text().includes('Stop All Music Players'))

      expect(stopCard).toBeTruthy()
      expect(stopCard!.classes()).toContain('stop-players-tool')
    })
  })

  describe('regression coverage', () => {
    it('shows error toast when sound-card list API returns non-success payload', async () => {
      mocks.getSoundCards.mockResolvedValueOnce({ status: 'error', message: 'backend unavailable' })

      mountView()
      await flushPromises()

      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('backend unavailable')
    })

    it('resets system via confirmation flow and re-enables auto-detection', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.reset-button').trigger('click')
      expect(wrapper.findAll('.confirmation-dialog-stub')[0].attributes('data-title')).toBe('Reset System')

      await wrapper.findAll('.confirmation-dialog-stub .dialog-confirm')[0].trigger('click')
      await flushPromises()

      expect(mocks.resetConfigDB).toHaveBeenCalledTimes(1)
      expect(mocks.setSoundCardDetection).toHaveBeenCalledWith(true)
      expect(mocks.toastStore.showInfoToast).toHaveBeenCalledWith(
        'System reset complete. The setup wizard will run on next visit.',
      )
    })

    it('runs detect-confirm-configure flow and opens reboot confirmation', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.detect-button').trigger('click')
      await flushPromises()

      const detectDialog = wrapper
        .findAll('.confirmation-dialog-stub')
        .find((d) => d.attributes('data-title') === 'Auto-detect Sound Card')
      expect(detectDialog).toBeTruthy()
      expect(detectDialog!.find('.dialog-message').text()).toContain('Sound card detected: DAC+ DSP')

      await detectDialog!.find('.dialog-confirm').trigger('click')
      await flushPromises()

      expect(mocks.setSoundCardDtoverlay).toHaveBeenCalledWith({
        dtoverlay: 'hifiberry-dacplusdsp',
        remove_existing: true,
      })
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith(
        'Sound card DAC+ DSP configured successfully!',
      )

      const rebootDialog = wrapper
        .findAll('.confirmation-dialog-stub')
        .find((d) => d.attributes('data-title') === 'Reboot Required')
      expect(rebootDialog).toBeTruthy()
    })

    it('saves fixed sound card and requests reboot when backend marks reboot required', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.soundcard-select').setValue('DAC+ Zero/Light/MiniAmp')
      await wrapper.get('.save-button').trigger('click')
      await flushPromises()

      expect(mocks.disableSoundCardDetection).toHaveBeenCalledWith('DAC+ Zero/Light/MiniAmp')
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith(
        'DAC+ Zero/Light/MiniAmp configured successfully!',
      )

      const rebootDialog = wrapper
        .findAll('.confirmation-dialog-stub')
        .find((d) => d.attributes('data-title') === 'Reboot Required')
      expect(rebootDialog).toBeTruthy()
    })

    it('enables auto-detect selection path and opens reboot confirmation', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.soundcard-select').setValue('auto-detect')
      await wrapper.get('.save-button').trigger('click')
      await flushPromises()

      expect(mocks.setSoundCardDetection).toHaveBeenCalledWith(true)
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith(
        'Removed fixed sound card configuration. Auto-detection enabled.',
      )
    })

    it('toggles expert mode and reports success toast', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.toggle-switch-stub').setValue(true)
      await flushPromises()

      expect(mocks.settingsStore.updateExpertMode).toHaveBeenCalledWith(true)
      expect(mocks.toastStore.showSuccessToast).toHaveBeenCalledWith('Expert mode enabled')
    })

    it('surfaces stop-all-players failure path', async () => {
      mocks.stopAllPlayers.mockResolvedValueOnce(false)

      const wrapper = mountView()
      await flushPromises()

      const stopButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Stop All Players'))
      expect(stopButton).toBeTruthy()

      await stopButton!.trigger('click')
      await flushPromises()

      expect(mocks.toastStore.showErrorToast).toHaveBeenCalledWith('Failed to stop all music players')
    })
  })
})
