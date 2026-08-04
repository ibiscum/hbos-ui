import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  markSetupCompletedMock: vi.fn(),

  getSystemInfoMock: vi.fn(),
  updateHostnameMock: vi.fn(),
  getSoundCardsMock: vi.fn(),
  detectSoundCardLiveMock: vi.fn(),
  disableSoundCardDetectionMock: vi.fn(),
  setSoundCardDetectionMock: vi.fn(),
  completeSetupMock: vi.fn(),
  rebootSystemMock: vi.fn(),

  enableNowServiceMock: vi.fn(),
  disableNowServiceMock: vi.fn(),
  getMultipleServiceStatusMock: vi.fn(),
  checkSystemdServiceExistsMock: vi.fn(),
  getExternalPlayersMock: vi.fn(),

  refreshStatusMock: vi.fn(),
  setPasswordMock: vi.fn(),
  setPolicyMock: vi.fn(),
}))

const {
  routerPushMock,
  markSetupCompletedMock,
  getSystemInfoMock,
  updateHostnameMock,
  getSoundCardsMock,
  detectSoundCardLiveMock,
  disableSoundCardDetectionMock,
  setSoundCardDetectionMock,
  completeSetupMock,
  rebootSystemMock,
  enableNowServiceMock,
  disableNowServiceMock,
  getMultipleServiceStatusMock,
  checkSystemdServiceExistsMock,
  getExternalPlayersMock,
  refreshStatusMock,
  setPasswordMock,
  setPolicyMock,
} = mocks

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: routerPushMock,
    }),
  }
})

vi.mock('@/router', () => ({
  markSetupCompleted: markSetupCompletedMock,
}))

vi.mock('@/api/system', () => ({
  getSystemInfo: getSystemInfoMock,
  updateHostname: updateHostnameMock,
  getSoundCards: getSoundCardsMock,
  detectSoundCardLive: detectSoundCardLiveMock,
  disableSoundCardDetection: disableSoundCardDetectionMock,
  setSoundCardDetection: setSoundCardDetectionMock,
  completeSetup: completeSetupMock,
  rebootSystem: rebootSystemMock,
}))

vi.mock('@/api/config', () => ({
  enableNowService: enableNowServiceMock,
  disableNowService: disableNowServiceMock,
  getMultipleServiceStatus: getMultipleServiceStatusMock,
  checkSystemdServiceExists: checkSystemdServiceExistsMock,
  getExternalPlayers: getExternalPlayersMock,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    refreshStatus: refreshStatusMock,
    setPassword: setPasswordMock,
    setPolicy: setPolicyMock,
  }),
}))

vi.mock('@/components/AddSmbMountDialog.vue', () => ({
  default: {
    name: 'AddSmbMountDialog',
    props: ['isOpen'],
    template: '<div class="nas-dialog-stub" :data-open="isOpen" />',
  },
}))

const makeWrapper = async () => {
  const { default: SetupView } = await import('../setup.vue')
  const wrapper = mount(SetupView)
  await flushPromises()
  return wrapper
}

describe('setup view consolidated unit and regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    routerPushMock.mockResolvedValue(undefined)
    markSetupCompletedMock.mockImplementation(() => undefined)

    getSystemInfoMock.mockResolvedValue({
      system: {
        pretty_hostname: 'Kitchen Speaker',
        hostname: 'kitchen-speaker',
      },
      soundcard: {
        name: 'HiFiBerry DAC+ Pro',
      },
    })

    getSoundCardsMock.mockResolvedValue({
      data: {
        soundcards: [
          { name: 'HiFiBerry DAC+ Pro', card_type: ['DAC'] },
          { name: 'HiFiBerry Amp4', card_type: ['Amp'] },
          { name: 'Null', card_type: ['Null'] },
        ],
      },
    })

    detectSoundCardLiveMock.mockResolvedValue({
      data: {
        card_name: 'HiFiBerry DAC+ Pro',
      },
    })

    updateHostnameMock.mockResolvedValue(undefined)
    disableSoundCardDetectionMock.mockResolvedValue(undefined)
    setSoundCardDetectionMock.mockResolvedValue(undefined)
    completeSetupMock.mockResolvedValue(undefined)
    rebootSystemMock.mockResolvedValue(undefined)

    enableNowServiceMock.mockResolvedValue(undefined)
    disableNowServiceMock.mockResolvedValue(undefined)
    getMultipleServiceStatusMock.mockResolvedValue(new Map())
    checkSystemdServiceExistsMock.mockResolvedValue({ data: { exists: true } })
    getExternalPlayersMock.mockResolvedValue([])

    refreshStatusMock.mockResolvedValue({
      has_password: false,
      protection: 'risky',
    })
    setPasswordMock.mockResolvedValue(undefined)
    setPolicyMock.mockResolvedValue(undefined)
  })

  describe('unit coverage', () => {
    it('loads system and auth status on mount and pre-fills system name', async () => {
      const wrapper = await makeWrapper()

      expect(getSystemInfoMock).toHaveBeenCalledTimes(1)
      expect(refreshStatusMock).toHaveBeenCalledTimes(1)
      expect((wrapper.get('#system-name').element as HTMLInputElement).value).toBe('Kitchen Speaker')
    })

    it('advances from step 1 to step 2 and loads sound cards', async () => {
      const wrapper = await makeWrapper()

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Sound Card')
      expect(getSoundCardsMock).toHaveBeenCalledTimes(1)
      expect(detectSoundCardLiveMock).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toContain('Detected sound card')
      expect(wrapper.text()).toContain('HiFiBerry DAC+ Pro')
    })

    it('switches to manual browse mode when choosing manual selection', async () => {
      const wrapper = await makeWrapper()

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      await wrapper.get('.detected-help a.link').trigger('click')
      await flushPromises()

      expect(wrapper.find('.soundcard-search').exists()).toBe(true)
      expect(wrapper.text()).toContain('Autodetect')
    })

    it('updates security gate based on matching password fields', async () => {
      const wrapper = await makeWrapper()

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Secure your device')

      const nextButton = wrapper.get('.setup-nav .btn.btn-primary')
      expect(nextButton.attributes('disabled')).toBeDefined()

      await wrapper.get('#setup-password').setValue('secret')
      await wrapper.get('#setup-password-confirm').setValue('mismatch')
      await flushPromises()

      expect(wrapper.get('.setup-nav .btn.btn-primary').attributes('disabled')).toBeDefined()

      await wrapper.get('#setup-password-confirm').setValue('secret')
      await flushPromises()

      expect(wrapper.get('.setup-nav .btn.btn-primary').attributes('disabled')).toBeUndefined()
    })
  })

  describe('regression coverage', () => {
    it('commits security settings before summary and shows setup complete', async () => {
      const wrapper = await makeWrapper()

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      await wrapper.get('#setup-password').setValue('secret')
      await wrapper.get('#setup-password-confirm').setValue('secret')
      await flushPromises()

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      expect(setPasswordMock).toHaveBeenCalledWith('secret', undefined, true)
      expect(wrapper.text()).toContain('Setup Complete')
    })

    it('finishes setup and navigates to now-playing', async () => {
      const wrapper = await makeWrapper()

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      await wrapper.get('#setup-password').setValue('secret')
      await wrapper.get('#setup-password-confirm').setValue('secret')
      await flushPromises()

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      const finishButton = wrapper.get('.setup-nav .btn.btn-primary')
      expect(finishButton.text()).toContain('Get Started')

      await finishButton.trigger('click')
      await flushPromises()

      expect(completeSetupMock).toHaveBeenCalledTimes(1)
      expect(markSetupCompletedMock).toHaveBeenCalledTimes(1)
      expect(routerPushMock).toHaveBeenCalledWith({ name: 'now-playing' })
    })

    it('supports existing-password setup rerun without requiring password entry', async () => {
      refreshStatusMock.mockResolvedValueOnce({
        has_password: true,
        protection: 'all',
      })

      const wrapper = await makeWrapper()

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Password set')

      await wrapper.get('.setup-nav .btn.btn-primary').trigger('click')
      await flushPromises()

      expect(setPasswordMock).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Setup Complete')
    })
  })
})
