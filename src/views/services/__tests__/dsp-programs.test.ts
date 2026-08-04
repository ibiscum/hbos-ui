import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import DspProgramsView from '../dsp-programs.vue'

const mocks = vi.hoisted(() => {
  const dspToolkitStore = {
    checkDSPStatus: vi.fn(),
    canUseDSP: vi.fn(),
  }

  const detectSoundCard = vi.fn()
  const getMetadata = vi.fn()
  const getCacheStatus = vi.fn()
  const getDSPProfilesMetadata = vi.fn()
  const getDSPProgramChecksum = vi.fn()
  const updateDSPProfile = vi.fn()

  return {
    dspToolkitStore,
    detectSoundCard,
    getMetadata,
    getCacheStatus,
    getDSPProfilesMetadata,
    getDSPProgramChecksum,
    updateDSPProfile,
  }
})

vi.mock('@/components/Icon.vue', () => ({
  default: {
    name: 'Icon',
    props: ['icon'],
    template: '<span class="icon-stub" :data-icon="icon" />',
  },
}))

vi.mock('@/components/PageContent.vue', () => ({
  default: {
    name: 'PageContent',
    props: ['title', 'backrouterLink'],
    template: '<section class="page-content-stub" :data-title="title"><slot /></section>',
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
      'hideCancelButton',
      'isDangerous',
      'disabled',
      'icon',
    ],
    emits: ['close', 'confirm'],
    template: `
      <div v-if="isOpen" class="confirmation-dialog-stub" :data-dangerous="isDangerous" :data-icon="icon">
        <h4 class="dialog-title">{{ title }}</h4>
        <p class="dialog-message">{{ message }}</p>
        <button class="dialog-confirm" :disabled="disabled" @click="$emit('confirm')">{{ confirmButtonText }}</button>
        <button class="dialog-close" @click="$emit('close')">Close</button>
        <span class="dialog-hide-cancel">{{ hideCancelButton }}</span>
      </div>
    `,
  },
}))

vi.mock('@/api/system', () => ({
  detectSoundCard: mocks.detectSoundCard,
}))

vi.mock('@/api/dsptoolkit', () => ({
  getMetadata: mocks.getMetadata,
  getCacheStatus: mocks.getCacheStatus,
  getDSPProfilesMetadata: mocks.getDSPProfilesMetadata,
  getDSPProgramChecksum: mocks.getDSPProgramChecksum,
  updateDSPProfile: mocks.updateDSPProfile,
}))

vi.mock('@/stores/dsp-toolkit', () => ({
  useDSPToolkitStore: () => mocks.dspToolkitStore,
}))

const mountView = () => mount(DspProgramsView)

const baseProfiles = {
  'profile-compatible.xml': {
    sampleRate: '48000',
    profileName: 'Compatible Profile',
    profileVersion: '1.0',
    programID: 'p1',
    modelName: 'DAC+ DSP',
    checksum: 'chk-compatible',
    _system: {
      profileName: 'Compatible Profile',
      profileVersion: '1.0',
      sampleRate: 48000,
      filename: 'profile-compatible.xml',
      filepath: '/profiles/profile-compatible.xml',
    },
  },
  'profile-other.xml': {
    sampleRate: '48000',
    profileName: 'Other Hardware Profile',
    profileVersion: '2.0',
    programID: 'p2',
    modelName: 'Beocreate 4-Channel Amplifier',
    checksum: 'chk-other',
    _system: {
      profileName: 'Other Hardware Profile',
      profileVersion: '2.0',
      sampleRate: 48000,
      filename: 'profile-other.xml',
      filepath: '/profiles/profile-other.xml',
    },
  },
}

describe('services/dsp-programs view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.dspToolkitStore.checkDSPStatus.mockResolvedValue('yes')
    mocks.dspToolkitStore.canUseDSP.mockResolvedValue(true)

    mocks.detectSoundCard.mockResolvedValue({
      status: 'success',
      message: 'detected',
      data: {
        card_name: 'HiFiBerry DAC+ DSP',
        dtoverlay: 'hifiberry-dacplusdsp',
        card_detected: true,
        definition_found: true,
      },
    })

    mocks.getMetadata.mockResolvedValue({ checksum: 'meta-checksum' })
    mocks.getCacheStatus.mockResolvedValue({
      profile: {
        cached: true,
        path: '/tmp/profile.xml',
        name: 'Installed Profile',
      },
      metadata: {
        cached: true,
        keyCount: 3,
        system: {
          profileName: 'Installed Profile',
          profileVersion: '1.2.3',
          sampleRate: 96000,
        },
      },
    })

    mocks.getDSPProfilesMetadata.mockResolvedValue({
      profiles: baseProfiles,
      count: 2,
      directory: '/profiles',
    })

    mocks.getDSPProgramChecksum.mockResolvedValue({
      checksum: 'chk-installed',
      format: 'md5',
    })

    mocks.updateDSPProfile.mockResolvedValue({
      status: 'success',
      message: 'DSP profile written to EEPROM',
      checksum: {
        memory: 'chk-compatible',
        profile: 'chk-compatible',
        match: true,
      },
    })
  })

  describe('unit coverage', () => {
    it('renders page shell and sound-card specific heading', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.get('.page-content-stub').attributes('data-title')).toBe('DSP Programs')
      expect(wrapper.text()).toContain('Installed DSP profile')
      expect(wrapper.text()).toContain('Available DSP Profiles for DAC+DSP')
    })

    it('renders installed profile details and checksum table rows', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Profile Name')
      expect(wrapper.text()).toContain('Installed Profile')
      expect(wrapper.text()).toContain('Version')
      expect(wrapper.text()).toContain('1.2.3')
      expect(wrapper.text()).toContain('Sample Rate')
      expect(wrapper.text()).toMatch(/96[.,]000 Hz/)
      expect(wrapper.text()).toContain('Program Checksum')
      expect(wrapper.text()).toContain('chk-installed')
    })

    it('filters visible profiles by detected hardware model compatibility', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Compatible Profile')
      expect(wrapper.text()).not.toContain('Other Hardware Profile')
      expect(wrapper.findAll('.profile-card')).toHaveLength(1)
    })

    it('shows model-specific empty copy when no compatible profiles are available', async () => {
      mocks.detectSoundCard.mockResolvedValueOnce({
        status: 'success',
        message: 'detected',
        data: {
          card_name: 'HiFiBerry Beocreate',
          dtoverlay: 'hifiberry-beocreate',
          card_detected: true,
          definition_found: true,
        },
      })
      mocks.getDSPProfilesMetadata.mockResolvedValueOnce({
        profiles: {
          'non-matching.xml': {
            ...baseProfiles['profile-compatible.xml'],
            profileName: 'Non Matching',
            modelName: 'DAC+ DSP',
            checksum: 'nm',
          },
        },
        count: 1,
        directory: '/profiles',
      })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('No compatible profiles found')
      expect(wrapper.text()).toContain('Beocreate 4-Channel Amplifier')
    })
  })

  describe('regression coverage', () => {
    it('shows DSP software unavailable error when store reports backend_error', async () => {
      mocks.dspToolkitStore.checkDSPStatus.mockResolvedValueOnce('backend_error')

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('HiFiBerry DSP software not available')
      expect(wrapper.text()).not.toContain('Installed DSP profile')
    })

    it('opens already-installed profile dialog and closes via confirm action', async () => {
      mocks.getDSPProgramChecksum.mockResolvedValueOnce({
        checksum: 'chk-compatible',
        format: 'md5',
      })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.profile-card').trigger('click')
      await flushPromises()

      expect(wrapper.get('.dialog-title').text()).toBe('Deployment Successful')
      expect(wrapper.get('.dialog-message').text()).toContain('already installed and active')
      expect(wrapper.get('.dialog-confirm').text()).toBe('OK')

      await wrapper.get('.dialog-confirm').trigger('click')
      await flushPromises()

      expect(wrapper.find('.confirmation-dialog-stub').exists()).toBe(false)
    })

    it('deploys non-installed profile using server filepath and refreshes status data', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.profile-card').trigger('click')
      await flushPromises()
      await wrapper.get('.dialog-confirm').trigger('click')
      await flushPromises()

      expect(mocks.updateDSPProfile).toHaveBeenCalledWith({
        file: '/profiles/profile-compatible.xml',
      })
      expect(mocks.getCacheStatus).toHaveBeenCalledTimes(2)
      expect(mocks.getDSPProgramChecksum).toHaveBeenCalledTimes(2)
      expect(wrapper.get('.dialog-title').text()).toBe('Deployment Successful')
      expect(wrapper.get('.dialog-message').text()).toContain('Profile deployed successfully!')
    })

    it('shows network guidance in deploy error dialog for fetch failures', async () => {
      mocks.updateDSPProfile.mockRejectedValueOnce(new Error('fetch failed'))

      const wrapper = mountView()
      await flushPromises()

      await wrapper.get('.profile-card').trigger('click')
      await flushPromises()
      await wrapper.get('.dialog-confirm').trigger('click')
      await flushPromises()

      expect(wrapper.get('.dialog-title').text()).toBe('Deployment Failed')
      expect(wrapper.get('.dialog-message').text()).toContain('Check that the DSP service is running and accessible.')
    })
  })
})
