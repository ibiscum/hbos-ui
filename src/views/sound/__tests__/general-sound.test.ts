import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import GeneralSoundView from '../general-sound.vue'

const state = vi.hoisted(() => ({
  sentMatrix: [
    [0.7, 0.3],
    [0.2, 0.8],
  ] as number[][],
}))

const mocks = vi.hoisted(() => ({
  getHeadphoneControls: vi.fn(),
  getHeadphoneVolume: vi.fn(),
  setHeadphoneVolume: vi.fn(),

  getSpeakerEQMasterGain: vi.fn(),
  setSpeakerEQMasterGain: vi.fn(),
  getSpeakerEQCrossbar: vi.fn(),
  setSpeakerEQCrossbarMatrix: vi.fn(),

  settingsToMatrix: vi.fn(),
  matrixToSettings: vi.fn(),
}))

vi.mock('@/api/volume', () => ({
  getHeadphoneControls: mocks.getHeadphoneControls,
  getHeadphoneVolume: mocks.getHeadphoneVolume,
  setHeadphoneVolume: mocks.setHeadphoneVolume,
}))

vi.mock('@/api/pipewire', () => ({
  getSpeakerEQMasterGain: mocks.getSpeakerEQMasterGain,
  setSpeakerEQMasterGain: mocks.setSpeakerEQMasterGain,
  getSpeakerEQCrossbar: mocks.getSpeakerEQCrossbar,
  setSpeakerEQCrossbarMatrix: mocks.setSpeakerEQCrossbarMatrix,
}))

vi.mock('@/helpers/mixing_matrix', () => ({
  settingsToMatrix: mocks.settingsToMatrix,
  matrixToSettings: mocks.matrixToSettings,
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template:
      '<section class="page-content-stub" :data-title="title" :data-back-link="backrouterLink?.name"><slot /></section>',
  },
}))

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<i class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/ProgressSlider.vue', () => ({
  default: {
    name: 'ProgressSlider',
    props: ['value', 'disabled', 'centerMark'],
    emits: ['click:progress'],
    template:
      '<button class="progress-slider-stub" :data-value="String(value)" :data-disabled="disabled ? \'yes\' : \'no\'" :data-center-mark="centerMark ?? \'none\'" @click="$emit(\'click:progress\', value)" />',
  },
}))

const mountView = () => mount(GeneralSoundView)

describe('sound/general-sound view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getHeadphoneControls.mockResolvedValue({
      status: 'success',
      data: { controls: ['Headphone Mixer'], count: 1 },
    })
    mocks.getHeadphoneVolume.mockResolvedValue({
      status: 'success',
      data: { volume: 65 },
    })
    mocks.setHeadphoneVolume.mockImplementation(async (volume: number) => ({
      status: 'success',
      message: 'updated',
      data: { volume },
    }))

    mocks.getSpeakerEQMasterGain.mockResolvedValue({ gain: -30 })
    mocks.setSpeakerEQMasterGain.mockImplementation(async (gain: number) => ({ gain }))

    mocks.getSpeakerEQCrossbar.mockResolvedValue({
      matrix: [
        [1, 0],
        [0, 1],
      ],
    })
    mocks.setSpeakerEQCrossbarMatrix.mockResolvedValue({ matrix: state.sentMatrix })

    mocks.settingsToMatrix.mockReturnValue(state.sentMatrix)
    mocks.matrixToSettings.mockReturnValue({ mode: 'stereo', balance: 0 })
  })

  describe('unit coverage', () => {
    it('renders page shell, controls, and initialized values', async () => {
      const wrapper = mountView()
      await flushPromises()

      const page = wrapper.get('.page-content-stub')
      expect(page.attributes('data-title')).toBe('General sound settings')
      expect(page.attributes('data-back-link')).toBe('sound')

      expect(wrapper.text()).toContain('Volume limit')
      expect(wrapper.text()).toContain('Headphone volume')
      expect(wrapper.text()).toContain('Balance')
      expect(wrapper.text()).toContain('Mode')

      expect(wrapper.text()).toContain('50%')
      expect(wrapper.text()).toContain('-30.0 dB')
      expect(wrapper.text()).toContain('65%')
      expect(wrapper.text()).toContain('-3.7 dB')

      const headphoneSetting = wrapper.findAll('.setting-item')[1]
      expect(headphoneSetting.attributes('title')).toContain('Headphone volume control: Headphone Mixer')

      wrapper.unmount()
    })

    it('applies mode and balance decoded from crossbar matrix', async () => {
      mocks.matrixToSettings.mockReturnValueOnce({ mode: 'swapped', balance: -0.3 })

      const wrapper = mountView()
      await flushPromises()

      const swappedButton = wrapper.findAll('.mode-btn').find((btn) => btn.text() === 'Swapped')
      expect(swappedButton?.classes()).toContain('active')
      expect(wrapper.text()).toContain('30% Left')
      expect(mocks.matrixToSettings).toHaveBeenCalledWith([
        [1, 0],
        [0, 1],
      ])

      wrapper.unmount()
    })

    it('updates master gain when volume slider changes', async () => {
      const wrapper = mountView()
      await flushPromises()

      const sliders = wrapper.findAllComponents({ name: 'ProgressSlider' })
      sliders[0].vm.$emit('click:progress', 75)
      await flushPromises()

      expect(mocks.setSpeakerEQMasterGain).toHaveBeenCalledWith(-15)
      expect(wrapper.text()).toContain('75%')
      wrapper.unmount()
    })

    it('updates headphone volume when available', async () => {
      const wrapper = mountView()
      await flushPromises()

      const sliders = wrapper.findAllComponents({ name: 'ProgressSlider' })
      sliders[1].vm.$emit('click:progress', 40)
      await flushPromises()

      expect(mocks.setHeadphoneVolume).toHaveBeenCalledWith(40)
      expect(wrapper.text()).toContain('40%')
      wrapper.unmount()
    })
  })

  describe('regression coverage', () => {
    it('does not call headphone API when headphone control is unavailable', async () => {
      mocks.getHeadphoneControls.mockResolvedValueOnce({
        status: 'success',
        data: { controls: [], count: 0 },
      })

      const wrapper = mountView()
      await flushPromises()

      const sliders = wrapper.findAllComponents({ name: 'ProgressSlider' })
      sliders[1].vm.$emit('click:progress', 55)
      await flushPromises()

      expect(mocks.setHeadphoneVolume).not.toHaveBeenCalled()
      const headphoneSetting = wrapper.findAll('.setting-item')[1]
      expect(headphoneSetting.attributes('title')).toContain("doesn't support headphones")
      expect(headphoneSetting.find('.percent').exists()).toBe(false)

      wrapper.unmount()
    })

    it('falls back to stereo and center when crossbar matrix cannot be decoded', async () => {
      mocks.matrixToSettings.mockReturnValueOnce(null)

      const wrapper = mountView()
      await flushPromises()

      const stereoButton = wrapper.findAll('.mode-btn').find((btn) => btn.text() === 'Stereo')
      const swappedButton = wrapper.findAll('.mode-btn').find((btn) => btn.text() === 'Swapped')
      expect(stereoButton?.classes()).toContain('active')
      expect(swappedButton?.classes()).not.toContain('active')
      expect(wrapper.text()).toContain('Center')

      wrapper.unmount()
    })

    it('disables volume slider when loading master gain fails', async () => {
      mocks.getSpeakerEQMasterGain.mockResolvedValueOnce({
        error: 'backend_unavailable',
        message: 'gain API unavailable',
      })

      const wrapper = mountView()
      await flushPromises()

      const sliders = wrapper.findAll('.progress-slider-stub')
      expect(sliders[0].attributes('data-disabled')).toBe('yes')

      wrapper.unmount()
    })

    it('disables balance and mode controls when crossbar loading fails', async () => {
      mocks.getSpeakerEQCrossbar.mockResolvedValueOnce({
        error: 'crossbar_missing',
        message: 'crossbar not available',
      })

      const wrapper = mountView()
      await flushPromises()

      const sliders = wrapper.findAll('.progress-slider-stub')
      expect(sliders[2].attributes('data-disabled')).toBe('yes')
      for (const btn of wrapper.findAll('.mode-btn')) {
        expect((btn.element as HTMLButtonElement).disabled).toBe(true)
      }

      wrapper.unmount()
    })

    it('keeps stereo selected and disables mode controls when mode write fails', async () => {
      mocks.setSpeakerEQCrossbarMatrix.mockResolvedValueOnce({
        error: 'write_failed',
        message: 'unable to persist matrix',
      })

      const wrapper = mountView()
      await flushPromises()

      const swappedButton = wrapper.findAll('.mode-btn').find((btn) => btn.text() === 'Swapped')
      expect(swappedButton).toBeTruthy()
      await swappedButton!.trigger('click')
      await flushPromises()

      const stereoButton = wrapper.findAll('.mode-btn').find((btn) => btn.text() === 'Stereo')
      expect(stereoButton?.classes()).toContain('active')
      expect(swappedButton?.classes()).not.toContain('active')
      for (const btn of wrapper.findAll('.mode-btn')) {
        expect((btn.element as HTMLButtonElement).disabled).toBe(true)
      }

      wrapper.unmount()
    })

    it('ignores invalid balance input and avoids crossbar write', async () => {
      const wrapper = mountView()
      await flushPromises()

      const sliders = wrapper.findAllComponents({ name: 'ProgressSlider' })
      sliders[2].vm.$emit('click:progress', Number.NaN)
      await flushPromises()

      expect(mocks.setSpeakerEQCrossbarMatrix).not.toHaveBeenCalled()

      wrapper.unmount()
    })
  })
})
